import type {PoolClient} from 'pg';

export const UNE_ACECHATTER_PAGE_SEED_VERSION=2;
type SeedSpec={
 factor:string;title:string;width:number;height:number;devices:readonly string[];
 desktop:boolean;tablet:boolean;phone:boolean;custom:boolean;
};

async function recordVersion(client:Pick<PoolClient,'query'>,tenantId:string,pageId:string,
 seedKey:string,version:number){
 const {rows}=await client.query<{page_id:string;version:number}>(`
  SELECT page_id,version FROM md_app_seed_page_versions
  WHERE tenant_id=$1 AND seed_key=$2 FOR UPDATE`,[tenantId,seedKey]);
 if(rows[0]&&rows[0].page_id!==pageId)throw new Error('UNE AceChatter Page seed ownership conflict');
 if(rows[0]?.version>=version)return;
 await client.query(`INSERT INTO md_app_seed_page_versions(tenant_id,page_id,seed_key,version)
  VALUES($1,$2,$3,$4)
  ON CONFLICT(tenant_id,seed_key) DO UPDATE SET version=EXCLUDED.version,applied_at=now()
  WHERE md_app_seed_page_versions.page_id=EXCLUDED.page_id
    AND md_app_seed_page_versions.version<EXCLUDED.version`,
  [tenantId,pageId,seedKey,version]);
}

export async function upgradeUneAceChatterPage(
 client:Pick<PoolClient,'query'>,tenantId:string,pageId:string,appApi:string,
 seedKey:string,version:number,spec:SeedSpec,writeSeedContent:()=>Promise<void>
):Promise<boolean>{
 const {rows:versions}=await client.query<{page_id:string;version:number}>(`
  SELECT page_id,version FROM md_app_seed_page_versions
  WHERE tenant_id=$1 AND seed_key=$2 FOR UPDATE`,[tenantId,seedKey]);
 if(versions[0]&&versions[0].page_id!==pageId)
  throw new Error('UNE AceChatter Page seed ownership conflict');
 if(versions[0]?.version>=version)return false;

 const {rows}=await client.query<{
  revision:number;status:string;page_type:string;layout_mode:string;template:string|null;
  title:string;activation_count:string;seed_activation_count:string;has_layout_history:boolean
 }>(`SELECT d.revision,d.status,d.page_type,d.layout_mode,d.template,p.title,
   (SELECT count(*) FROM md_lightning_page_activation a
    WHERE a.tenant_id=d.tenant_id AND a.page_id=d.page_id)::text AS activation_count,
   (SELECT count(*) FROM md_lightning_page_activation a
    WHERE a.tenant_id=d.tenant_id AND a.page_id=d.page_id
      AND a.scope='App Default' AND a.app_api=$3)::text AS seed_activation_count,
   EXISTS(SELECT 1 FROM md_page_layout_heads h
    WHERE h.tenant_id=d.tenant_id AND h.page_id=d.page_id) AS has_layout_history
  FROM md_lightning_page_details d
  JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
  WHERE d.tenant_id=$1 AND d.page_id=$2
  FOR UPDATE OF d,p`,[tenantId,pageId,appApi]);
 const page=rows[0];
 if(!page||page.revision!==1||page.status!=='Active'||page.page_type!=='App Page'
   ||page.layout_mode!=='template'||page.template!=='main-sidebar'||page.title!==spec.title
   ||page.activation_count!=='1'||page.seed_activation_count!=='1'||page.has_layout_history)
  return false;

 const updated=await client.query(`UPDATE md_lightning_page_details
  SET canvas_width=$3,canvas_height=$4,devices=$5::text[],revision=revision+1,updated_at=now()
  WHERE tenant_id=$1 AND page_id=$2 AND revision=1`,
  [tenantId,pageId,spec.width,spec.height,[...spec.devices]]);
 if(updated.rowCount!==1)return false;
 await client.query('DELETE FROM md_lightning_page_node_properties WHERE tenant_id=$1 AND page_id=$2',[tenantId,pageId]);
 await client.query('DELETE FROM md_lightning_page_nodes WHERE tenant_id=$1 AND page_id=$2',[tenantId,pageId]);
 await client.query('DELETE FROM md_lightning_page_activation WHERE tenant_id=$1 AND page_id=$2',[tenantId,pageId]);
 await writeSeedContent();
 await recordVersion(client,tenantId,pageId,seedKey,version);
 return true;
}

export async function recordUneAceChatterPageSeed(
 client:Pick<PoolClient,'query'>,tenantId:string,pageId:string,seedKey:string,version:number
){
 await recordVersion(client,tenantId,pageId,seedKey,version);
}
