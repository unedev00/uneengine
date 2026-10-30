import {validatePageComponentContracts} from '../system-support/component-contract-store.js';
import {requirePagePropertyContract} from '../system-support/page-property-contract.js';
import type {PoolClient} from 'pg';
import {encodeMetadataValue,decodeMetadataValues,type MetadataValueRow} from './component-runtime.js';
import type {SqlPersistence} from './sql-persistence.js';

export const PAGE_LAYOUT_VARIANTS=['Mobile','Desktop','Tablet','Custom'] as const;
export type PageLayoutVariant=typeof PAGE_LAYOUT_VARIANTS[number];
type PageSnapshot={
 apiName:string;label:string;pageType:string;targetObject:string;layoutMode:string;template?:string;
 canvasWidth:number;canvasHeight:number;canvasFillColor?:string;status:string;revision?:number;
 customTargetEnabled?:boolean;customTargetMinWidth?:number;customTargetMaxWidth?:number;
 components:Array<Record<string,unknown>>;
 activationAssignments?:Array<Record<string,unknown>>;
};
type VersionRow={
 version:number;page_label:string;layout_mode:string;template:string|null;canvas_width:number;canvas_height:number;canvas_fill_color:string;
 custom_target_enabled:boolean;custom_target_min_width:number;custom_target_max_width:number;
};
type HeadRow={draft_version:number|null;published_version:number|null};
type PageActivationRow={
 assignment_id:string;scope:string;app_api:string|null;profile_id:string|null;
 record_type_id:string|null;desktop:boolean;phone:boolean;tablet:boolean;custom:boolean;sort_order:number;
};
/** A published variant modifies only its device assignment, never assignments
 * owned by another layout or a different app/profile/record type. */
export function mergePublishedPageActivation(
 existing:PageActivationRow[],incoming:PageActivationRow[],variant:PageLayoutVariant
):PageActivationRow[]{
 // Older and independently bootstrapped variants may have no assignment
 // snapshot even though another published layout activated the shared page.
 // In that case changing only its layout must not deactivate the page.
 // Existing legacy layouts may have no assignment snapshot. Never let a
 // newly published device layout silently deactivate the shared live page.
 if(!incoming.length)return existing.map(a=>({...a}));
 const affected=({Mobile:'phone',Desktop:'desktop',Tablet:'tablet',Custom:'custom'} as const)[variant];
 const hasTarget=(a:PageActivationRow)=>a.desktop||a.phone||a.tablet||a.custom;
 const retained=existing.map(a=>({...a,[affected]:false})).filter(hasTarget);
 const replacement=incoming.filter(a=>a[affected]).map(a=>({
   ...a,desktop:affected==='desktop',phone:affected==='phone',
   tablet:affected==='tablet',custom:affected==='custom'
 }));
 const merged:PageActivationRow[]=[];
 const positions=new Map<string,number>();
 const ids=new Set<string>();
 for(const row of [...retained,...replacement]){
  const key=JSON.stringify([row.scope,row.app_api,row.profile_id,row.record_type_id]);
  const position=positions.get(key);
  if(position!==undefined){
   const old=merged[position];
   merged[position]={...old,desktop:old.desktop||row.desktop,phone:old.phone||row.phone,
     tablet:old.tablet||row.tablet,custom:old.custom||row.custom};
   continue;
  }
  let assignmentId=row.assignment_id;
  if(ids.has(assignmentId)){
   let suffix=1;
   do{assignmentId='layout-'+String(suffix++);}while(ids.has(assignmentId));
  }
  ids.add(assignmentId);
  positions.set(key,merged.length);
  merged.push({...row,assignment_id:assignmentId,sort_order:merged.length});
 }
 return merged;
}

type NodeRow={component_key:string;component_type:string;label:string;region:string;visible:boolean};
const validKey=(value:unknown):value is string=>
 typeof value==='string'&&value.length>0&&value.length<=128;
const widthFor=(variant:PageLayoutVariant,base:PageSnapshot)=>
 variant==='Mobile'?390:variant==='Tablet'?1024:base.canvasWidth;
const heightFor=(variant:PageLayoutVariant,base:PageSnapshot)=>
 variant==='Mobile'?844:variant==='Tablet'?768:base.canvasHeight;
export function pageLayoutVariant(value:unknown):PageLayoutVariant{
 if(!PAGE_LAYOUT_VARIANTS.includes(value as PageLayoutVariant))throw new Error('Invalid page layout variant');
 return value as PageLayoutVariant;
}
export const runtimeLayoutVariant=(value:string):PageLayoutVariant=>
 value==='Phone'||value==='Mobile'?'Mobile':value==='Tablet'?'Tablet':value==='Custom'?'Custom':'Desktop';

export class PageLayoutVersionRuntime{
 constructor(private readonly db:SqlPersistence){}
 private async pageId(tenant:string,name:string,client:PoolClient){
  const {rows}=await client.query<{id:string;status:string}>(`SELECT p.id,d.status FROM md_page_definitions p
   JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
   WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true
   FOR UPDATE OF d`,[tenant,name]);
  if(!rows[0])throw new Error('Page not found');
  const owned=await client.query('SELECT 1 FROM md_app_seed_pages WHERE tenant_id=$1 AND page_id=$2 LIMIT 1',[tenant,rows[0].id]);
  if(owned.rowCount)throw new Error('Invalid managed Page update');
  return rows[0];
 }
 /** Bootstrap all four layouts from the intact legacy published metadata. Never overwrite tenant edits. */
 private async bootstrap(client:PoolClient,tenant:string,id:string){
  const existing=await client.query('SELECT 1 FROM md_page_layout_heads WHERE tenant_id=$1 AND page_id=$2 LIMIT 1',[tenant,id]);
  if(existing.rowCount)return;
  await client.query(`INSERT INTO md_page_layout_versions
    (tenant_id,page_id,variant,version,page_label,layout_mode,template,canvas_width,canvas_height)
   SELECT d.tenant_id,d.page_id,v.variant,1,p.title,d.layout_mode,d.template,
    CASE v.variant WHEN 'Mobile' THEN 390 WHEN 'Tablet' THEN 1024 ELSE d.canvas_width END,
    CASE v.variant WHEN 'Mobile' THEN 844 WHEN 'Tablet' THEN 768 ELSE d.canvas_height END
   FROM md_lightning_page_details d JOIN md_page_definitions p
    ON p.tenant_id=d.tenant_id AND p.id=d.page_id
   CROSS JOIN (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(variant)
   WHERE d.tenant_id=$1 AND d.page_id=$2 ON CONFLICT DO NOTHING`,[tenant,id]);
  await client.query(`INSERT INTO md_page_layout_version_nodes
   (tenant_id,page_id,variant,version,component_key,component_type,label,region,visible,sort_order)
   SELECT n.tenant_id,n.page_id,v.variant,1,n.component_key,n.component_type,n.label,n.region,n.visible,n.sort_order
   FROM md_lightning_page_nodes n
   CROSS JOIN (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(variant)
   WHERE n.tenant_id=$1 AND n.page_id=$2 ON CONFLICT DO NOTHING`,[tenant,id]);
  await client.query(`INSERT INTO md_page_layout_version_properties
   (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
   SELECT p.tenant_id,p.page_id,v.variant,1,p.component_key,p.property_path,p.value_kind,p.value_text
   FROM md_lightning_page_node_properties p
   CROSS JOIN (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(variant)
   WHERE p.tenant_id=$1 AND p.page_id=$2 ON CONFLICT DO NOTHING`,[tenant,id]);
  await client.query(`INSERT INTO md_page_layout_version_activation
   (tenant_id,page_id,variant,version,assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
   SELECT a.tenant_id,a.page_id,v.variant,1,a.assignment_id,a.scope,a.app_api,a.profile_id,
    a.record_type_id,a.desktop,a.phone,a.tablet,a.custom,a.sort_order
   FROM md_lightning_page_activation a
   CROSS JOIN (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(variant)
   WHERE a.tenant_id=$1 AND a.page_id=$2 ON CONFLICT DO NOTHING`,[tenant,id]);
  await client.query(`INSERT INTO md_page_layout_heads
   (tenant_id,page_id,variant,draft_version,published_version)
   SELECT d.tenant_id,d.page_id,v.variant,1,CASE WHEN d.status='Active' THEN 1 ELSE NULL END
   FROM md_lightning_page_details d
   CROSS JOIN (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(variant)
   WHERE d.tenant_id=$1 AND d.page_id=$2 ON CONFLICT DO NOTHING`,[tenant,id]);
 }
 private validate(page:PageSnapshot,name:string){
  if(page.apiName!==name||!validKey(page.label)||!['template','free-canvas'].includes(page.layoutMode)
   ||!Number.isInteger(page.canvasWidth)||page.canvasWidth<320||page.canvasWidth>10000
   ||!Number.isInteger(page.canvasHeight)||page.canvasHeight<320||page.canvasHeight>10000
    ||(page.canvasFillColor!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(page.canvasFillColor))
   ||!Array.isArray(page.components)||page.components.length>400
   ||!Array.isArray(page.activationAssignments??[])||(page.activationAssignments??[]).length>200
   ||(page.customTargetEnabled!==undefined&&typeof page.customTargetEnabled!=='boolean')
   ||(page.customTargetMinWidth!==undefined&&(!Number.isInteger(page.customTargetMinWidth)
      ||page.customTargetMinWidth<320||page.customTargetMinWidth>10000))
   ||(page.customTargetMaxWidth!==undefined&&(!Number.isInteger(page.customTargetMaxWidth)
      ||page.customTargetMaxWidth<320||page.customTargetMaxWidth>10000))
   ||(page.customTargetMinWidth??320)>(page.customTargetMaxWidth??10000))
    throw new Error('Invalid Page layout draft');
  const ids=new Set<string>();
  for(const component of page.components){
   if(!component||!validKey(component.id)||!validKey(component.type)||typeof component.label!=='string'
      ||component.label.length>200||ids.has(component.id))throw new Error('Invalid Page layout block');
   requirePagePropertyContract(String(component.type),component.properties);
   ids.add(component.id);
  }
  const assignmentIds=new Set<string>();
  for(const a of page.activationAssignments??[]){
   if(!a||!validKey(a.id)||assignmentIds.has(a.id)
    ||!['Org Default','App Default','App and Profile','App, Record Type, and Profile'].includes(String(a.scope))
    ||!Array.isArray(a.formFactors)||!a.formFactors.length
    ||a.formFactors.some(f=>!['Desktop','Phone','Tablet','Custom'].includes(String(f)))
    ||(a.scope!=='Org Default'&&!validKey(a.appId))
    ||(['App and Profile','App, Record Type, and Profile'].includes(String(a.scope))&&!validKey(a.profileId))
    ||(a.scope==='App, Record Type, and Profile'&&!validKey(a.recordTypeId)))
    throw new Error('Invalid Page assignment');
   assignmentIds.add(a.id);
  }
 }
 private async snapshot(tenant:string,id:string,variant:PageLayoutVariant,version:number){
  const [versionRows,nodeRows,properties,assignments]=await Promise.all([
   this.db.query<VersionRow>(`SELECT version,page_label,layout_mode,template,canvas_width,canvas_height,canvas_fill_color,
      custom_target_enabled,custom_target_min_width,custom_target_max_width
    FROM md_page_layout_versions WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4`,[tenant,id,variant,version]),
   this.db.query<NodeRow>(`SELECT component_key,component_type,label,region,visible FROM md_page_layout_version_nodes
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4 ORDER BY sort_order`,[tenant,id,variant,version]),
   this.db.query<MetadataValueRow & {component_key:string}>(`SELECT component_key,property_path,value_kind,value_text FROM md_page_layout_version_properties
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4`,[tenant,id,variant,version]),
   this.db.query<{assignment_id:string;scope:string;app_api:string|null;profile_id:string|null;record_type_id:string|null;desktop:boolean;phone:boolean;tablet:boolean;custom:boolean}>(`SELECT assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom
    FROM md_page_layout_version_activation WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4 ORDER BY sort_order`,[tenant,id,variant,version])
  ]);
  const row=versionRows.rows[0];if(!row)throw new Error('Page layout revision not found');
  return {label:row.page_label,layoutMode:row.layout_mode,template:row.template??undefined,
   canvasWidth:row.canvas_width,canvasHeight:row.canvas_height,canvasFillColor:row.canvas_fill_color,
   customTargetEnabled:row.custom_target_enabled,
   customTargetMinWidth:row.custom_target_min_width,customTargetMaxWidth:row.custom_target_max_width,
   components:nodeRows.rows.map(n=>{
    const data=decodeMetadataValues(properties.rows.filter(p=>p.component_key===n.component_key));
    return {...(data.extra as Record<string,unknown>??{}),id:n.component_key,type:n.component_type,
     label:n.label,region:n.region,visible:n.visible,properties:data.props??{}};
   }),
   activationAssignments:assignments.rows.map(a=>({
    id:a.assignment_id,scope:a.scope,appId:a.app_api,profileId:a.profile_id,recordTypeId:a.record_type_id,
    formFactors:[...(a.desktop?['Desktop']:[]),...(a.phone?['Phone']:[]),...(a.tablet?['Tablet']:[]),...(a.custom?['Custom']:[])]
   }))
  };
 }
 async load(tenant:string,name:string,variant:PageLayoutVariant,view:'draft'|'published',base:PageSnapshot){
  const found=await this.db.query<{id:string}>(`SELECT id FROM md_page_definitions WHERE tenant_id=$1 AND api_name=$2 AND enabled=true`,[tenant,name]);
  const id=found.rows[0]?.id;if(!id)throw new Error('Page not found');
  const {rows}=await this.db.query<HeadRow>(`SELECT draft_version,published_version FROM md_page_layout_heads
   WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,[tenant,id,variant]);
  const head=rows[0];
  const revision=view==='draft'?head?.draft_version:head?.published_version;
  const layout=revision?await this.snapshot(tenant,id,variant,revision):null;
  const legacy=layout??{label:base.label,layoutMode:base.layoutMode,template:base.template,
   canvasWidth:widthFor(variant,base),canvasHeight:heightFor(variant,base),
    canvasFillColor:base.canvasFillColor??'#ffffff',
   components:base.components,activationAssignments:base.activationAssignments,
   customTargetEnabled:false,customTargetMinWidth:320,customTargetMaxWidth:10000};
  return {...base,...legacy,layoutVariant:variant,draftRevision:head?.draft_version??0,
   publishedRevision:head?.published_version??0};
 }
 async saveDraft(tenant:string,name:string,variant:PageLayoutVariant,raw:unknown,base:PageSnapshot,actor?:string){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid Page layout draft');
  const page=raw as PageSnapshot & {draftRevision?:number};
  this.validate(page,name);
  await validatePageComponentContracts(this.db,tenant,page.components,variant);
  await this.db.transaction(async client=>{
   const found=await this.pageId(tenant,name,client);
   const before=await client.query<HeadRow>(`SELECT draft_version,published_version FROM md_page_layout_heads
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,[tenant,found.id,variant]);
   await this.bootstrap(client,tenant,found.id);
   const heads=await client.query<HeadRow>(`SELECT draft_version,published_version FROM md_page_layout_heads
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 FOR UPDATE`,[tenant,found.id,variant]);
   const current=heads.rows[0]?.draft_version??0;
   if(page.draftRevision!==undefined &&
      (before.rows.length ? page.draftRevision!==current : page.draftRevision!==0))
    throw new Error('Page layout draft revision conflict');
   // A restore only moves the draft head, never rewinds the immutable sequence.
   const latest=await client.query<{version:number}>(`SELECT COALESCE(MAX(version),0)::integer AS version
    FROM md_page_layout_versions WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,
    [tenant,found.id,variant]);
   const version=(latest.rows[0]?.version??0)+1;
   await client.query(`INSERT INTO md_page_layout_versions
    (tenant_id,page_id,variant,version,page_label,layout_mode,template,canvas_width,canvas_height,
      custom_target_enabled,custom_target_min_width,custom_target_max_width,canvas_fill_color)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[tenant,found.id,variant,version,
      page.label,page.layoutMode,page.template??null,page.canvasWidth,page.canvasHeight,
      variant==='Custom'&&page.customTargetEnabled===true,
      page.customTargetMinWidth??320,page.customTargetMaxWidth??10000,page.canvasFillColor??'#ffffff']);
   for(const [index,c] of page.components.entries()){
    await client.query(`INSERT INTO md_page_layout_version_nodes
     (tenant_id,page_id,variant,version,component_key,component_type,label,region,visible,sort_order)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
     [tenant,found.id,variant,version,c.id,c.type,c.label,c.region??'main',c.visible!==false,index]);
    const props:Array<{path:string;kind:string;text:string|null}>=[];
    const extra=Object.fromEntries(Object.entries(c).filter(([k])=>!['id','type','label','region','visible','properties'].includes(k)));
    encodeMetadataValue(c.properties??{},'/props',props);encodeMetadataValue(extra,'/extra',props);
    for(const p of props){
     if(p.path.length>1024)throw new Error('Invalid Page property path');
     await client.query(`INSERT INTO md_page_layout_version_properties
      (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[tenant,found.id,variant,version,c.id,p.path,p.kind,p.text]);
    }
   }
   for(const [index,a] of (page.activationAssignments??[]).entries())await client.query(`INSERT INTO md_page_layout_version_activation
    (tenant_id,page_id,variant,version,assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [tenant,found.id,variant,version,a.id,a.scope,a.appId??null,a.profileId??null,a.recordTypeId??null,
     (a.formFactors as string[]).includes('Desktop'),(a.formFactors as string[]).includes('Phone'),
     (a.formFactors as string[]).includes('Tablet'),(a.formFactors as string[]).includes('Custom'),index]);
   await client.query(`UPDATE md_page_layout_heads SET draft_version=$4,updated_at=now()
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,[tenant,found.id,variant,version]);
   if(actor)await client.query(`INSERT INTO md_page_layout_audit
      (tenant_id,page_id,actor_user_id,variant,version,operation)
      VALUES($1,$2,$3,$4,$5,'SaveDraft')`,[tenant,found.id,actor,variant,version]);
  });
  return this.load(tenant,name,variant,'draft',base);
 }
 async publish(tenant:string,name:string,variant:PageLayoutVariant,expected?:number,actor?:string){
  await this.db.transaction(async client=>{
   const found=await this.pageId(tenant,name,client);
   const {rows}=await client.query<HeadRow>(`SELECT draft_version,published_version FROM md_page_layout_heads
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 FOR UPDATE`,[tenant,found.id,variant]);
   const version=rows[0]?.draft_version;
   if(!version)throw new Error('Save a page layout draft before publishing');
   if(expected!==undefined&&version!==expected)throw new Error('Page layout draft revision conflict');
   const revision=await client.query<VersionRow>(`SELECT page_label FROM md_page_layout_versions
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4`,[tenant,found.id,variant,version]);
   const [incoming,existing,type]=await Promise.all([
    client.query<PageActivationRow>(`SELECT assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order
      FROM md_page_layout_version_activation
      WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4 ORDER BY sort_order`,[tenant,found.id,variant,version]),
    client.query<PageActivationRow>(`SELECT assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order
      FROM md_lightning_page_activation WHERE tenant_id=$1 AND page_id=$2 ORDER BY sort_order
      FOR UPDATE`,[tenant,found.id]),
    client.query<{page_type:string}>('SELECT page_type FROM md_lightning_page_details WHERE tenant_id=$1 AND page_id=$2',[tenant,found.id])
   ]);
   const activeAssignments=mergePublishedPageActivation(existing.rows,incoming.rows,variant);
   if(type.rows[0]?.page_type!=='App Page'&&!activeAssignments.length)
    throw new Error('Add a page activation assignment before publishing');
   await client.query('UPDATE md_page_definitions SET title=$3 WHERE tenant_id=$1 AND id=$2',
    [tenant,found.id,revision.rows[0].page_label]);
   await client.query(`UPDATE md_lightning_page_details SET status='Active',revision=revision+1,updated_at=now()
    WHERE tenant_id=$1 AND page_id=$2`,[tenant,found.id]);
   await client.query('DELETE FROM md_lightning_page_activation WHERE tenant_id=$1 AND page_id=$2',[tenant,found.id]);
   for(const a of activeAssignments)await client.query(`INSERT INTO md_lightning_page_activation
     (tenant_id,page_id,assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
     [tenant,found.id,a.assignment_id,a.scope,a.app_api,a.profile_id,a.record_type_id,
       a.desktop,a.phone,a.tablet,a.custom,a.sort_order]);
   // First activation publishes the initial baseline of every form factor.
   // No runtime variant may fall back to an unpublished draft after a page goes live.
   await client.query(`UPDATE md_page_layout_heads
    SET published_version=1,updated_at=now()
    WHERE tenant_id=$1 AND page_id=$2 AND published_version IS NULL`,[tenant,found.id]);
   await client.query(`UPDATE md_page_layout_heads SET published_version=$4,updated_at=now()
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,[tenant,found.id,variant,version]);
   if(actor)await client.query(`INSERT INTO md_page_layout_audit
      (tenant_id,page_id,actor_user_id,variant,version,operation)
      VALUES($1,$2,$3,$4,$5,'Publish')`,[tenant,found.id,actor,variant,version]);
  });
 }
 async rollback(tenant:string,name:string,variant:PageLayoutVariant,version:number,actor?:string){
  if(!Number.isInteger(version)||version<1)throw new Error('Invalid page revision');
  await this.db.transaction(async client=>{
   const found=await this.pageId(tenant,name,client);
   const exists=await client.query('SELECT 1 FROM md_page_layout_versions WHERE tenant_id=$1 AND page_id=$2 AND variant=$3 AND version=$4',[tenant,found.id,variant,version]);
   if(!exists.rowCount)throw new Error('Page layout revision not found');
   await client.query(`UPDATE md_page_layout_heads SET draft_version=$4,updated_at=now()
    WHERE tenant_id=$1 AND page_id=$2 AND variant=$3`,[tenant,found.id,variant,version]);
   if(actor)await client.query(`INSERT INTO md_page_layout_audit
      (tenant_id,page_id,actor_user_id,variant,version,operation)
      VALUES($1,$2,$3,$4,$5,'RestoreDraft')`,[tenant,found.id,actor,variant,version]);
  });
  // Rollback prepares an immutable prior snapshot as the draft; publishing remains explicit.
 }
 async history(tenant:string,name:string,variant:PageLayoutVariant){
  const {rows}=await this.db.query<{version:number;created_at:Date;is_published:boolean;is_draft:boolean}>(`SELECT v.version,v.created_at,
    v.version=h.published_version AS is_published,v.version=h.draft_version AS is_draft
    FROM md_page_layout_versions v JOIN md_page_layout_heads h
    ON h.tenant_id=v.tenant_id AND h.page_id=v.page_id AND h.variant=v.variant
    JOIN md_page_definitions p ON p.tenant_id=v.tenant_id AND p.id=v.page_id
    WHERE v.tenant_id=$1 AND p.api_name=$2 AND v.variant=$3 ORDER BY v.version DESC LIMIT 100`,[tenant,name,variant]);
  return rows.map(r=>({version:r.version,createdAt:r.created_at,published:r.is_published,draft:r.is_draft}));
 }
}
