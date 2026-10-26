import type {Express} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import type {FlowRuntime} from '../system-files/flow-runtime.js';
import {authenticated,wrap,api} from './ApiAuthenticationGuard.js';
export function registerPageApiController(app:Express,db:SqlPersistence,rbac:RbacEngine){

  // Deactivation is not a draft save: it takes a published page out of routing
  // without deleting either its draft or its published per-device snapshots.
  app.post('/api/metadata/pages/:apiName/deactivate',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await db.transaction(async client=>{
      const found=await client.query<{id:string,status:string}>(`
        SELECT p.id,d.status FROM md_page_definitions p
        JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
        WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true
        FOR UPDATE OF p,d`,[actor.tenant_id,name]);
      const current=found.rows[0];
      if(!current)throw new Error('Page not found');
      const managed=await client.query('SELECT 1 FROM md_app_seed_pages WHERE tenant_id=$1 AND page_id=$2',
        [actor.tenant_id,current.id]);
      if(managed.rowCount)throw new Error('App-owned Page must be managed through AppExchange');
      const appHome=await client.query('SELECT 1 FROM md_app_home_pages WHERE tenant_id=$1 AND page_id=$2',
        [actor.tenant_id,current.id]);
      if(appHome.rowCount)throw new Error('Reassign the App Home Page before deactivating it');
      const kind=await client.query<{target_object:string;record_mode:string}>(`
        SELECT target_object,record_mode FROM md_lightning_page_details
        WHERE tenant_id=$1 AND page_id=$2 AND page_type='Record Page'`,
        [actor.tenant_id,current.id]);
      if(kind.rows[0]&&current.status==='Active'){
        const replacement=await client.query<{available:boolean}>(`
          SELECT EXISTS(SELECT 1 FROM md_lightning_page_details d
          JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
          WHERE d.tenant_id=$1 AND d.page_id<>$2 AND d.page_type='Record Page'
            AND d.target_object=$3 AND d.record_mode=$4
            AND d.status='Active' AND p.enabled=true) AS available`,
          [actor.tenant_id,current.id,kind.rows[0].target_object,kind.rows[0].record_mode]);
        if(!replacement.rows[0]?.available)
          throw new Error('Publish a replacement Record '+kind.rows[0].record_mode+' Page before deactivating this one');
      }
      await client.query(`UPDATE md_lightning_page_details
        SET status='Draft',revision=revision+1,updated_at=now()
        WHERE tenant_id=$1 AND page_id=$2`,[actor.tenant_id,current.id]);
      // Preserve md_page_layout_heads and all immutable versions for reactivation.
    });
    res.status(204).end();
  }));
  app.delete('/api/metadata/pages/:apiName',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await db.transaction(async client=>{
      const {rows}=await client.query<{id:string;enabled:boolean}>(`
        SELECT id,enabled FROM md_page_definitions
        WHERE tenant_id=$1 AND api_name=$2 FOR UPDATE`,[actor.tenant_id,name]);
      const page=rows[0];
      if(!page)throw new Error('Page not found');
      const appOwned=await client.query(`
        SELECT 1 FROM md_app_seed_pages WHERE tenant_id=$1 AND page_id=$2 LIMIT 1`,
        [actor.tenant_id,page.id]);
      if(appOwned.rowCount)throw new Error('App-owned Page must be managed through AppExchange');
      const appHome=await client.query(`
        SELECT 1 FROM md_app_home_pages WHERE tenant_id=$1 AND page_id=$2 LIMIT 1`,
        [actor.tenant_id,page.id]);
      if(appHome.rowCount)throw new Error('App Home Page must be reassigned before removal');
      // Every Object retains an editable default View and Edit Page. A replacement
      // of the same mode must be published before the last page can be archived.
      const activeRecord=await client.query<{target_object:string;record_mode:string}>(`
        SELECT target_object,record_mode FROM md_lightning_page_details
        WHERE tenant_id=$1 AND page_id=$2 AND page_type='Record Page'`,
        [actor.tenant_id,page.id]);
      if(activeRecord.rows[0]){
        const {rows:replacement}=await client.query<{available:boolean}>(`
          SELECT EXISTS(SELECT 1 FROM md_lightning_page_details d
          JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
          WHERE d.tenant_id=$1 AND d.page_id<>$2 AND d.page_type='Record Page'
            AND d.target_object=$3 AND d.record_mode=$4
            AND d.status='Active' AND p.enabled=true) AS available`,
          [actor.tenant_id,page.id,activeRecord.rows[0].target_object,
            activeRecord.rows[0].record_mode]);
        if(!replacement[0]?.available)throw new Error(
          'Publish a replacement Record '+activeRecord.rows[0].record_mode+' Page before archiving this one');
      }
      // Soft-deactivate only; preserve layouts, history, component properties and business records.
      await client.query(`
        UPDATE md_page_definitions SET enabled=false WHERE tenant_id=$1 AND id=$2`,
        [actor.tenant_id,page.id]);
      await client.query(`
        UPDATE md_lightning_page_details SET status='Draft' WHERE tenant_id=$1 AND page_id=$2`,
        [actor.tenant_id,page.id]);
    });
    res.status(204).end();
  }));

}
