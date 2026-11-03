import type {Express} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import type {FlowRuntime} from '../system-files/flow-runtime.js';
import {authenticated,wrap,api} from './ApiAuthenticationGuard.js';
import {PageRuntime} from '../system-files/page-runtime.js';
import {pageLayoutVariant} from '../system-files/page-layout-version-runtime.js';
import {assertMetadataPackageEditable} from '../system-support/metadata-package-service.js';
import {registerPageDetailsController} from './PageDetailsController.js';
import {applyInventoryCsv,exportInventoryCsv,inventoryDefinitions,inventoryRequestedTypes,type InventoryPage} from '../system-support/page-inventory-csv.js';
import {validateExplicitComponentNames} from '../system-support/page-component-names.js';
import {requirePagePropertyContract} from '../system-support/page-property-contract.js';
import {validatePageComponentContracts} from '../system-support/component-contract-store.js';
export function registerPageApiController(app:Express,db:SqlPersistence,rbac:RbacEngine){
  const pages=new PageRuntime(db);
  const preflightInventory=async(tenant:string,variant:ReturnType<typeof pageLayoutVariant>,
    result:ReturnType<typeof applyInventoryCsv>)=>{
    if(!result.valid||!result.changes)return result;
    try{validateExplicitComponentNames(result.page.components);}
    catch(error){result.issues.push({row:1,component_name:'',component_property:'component_name',remark:error instanceof Error?error.message:'Duplicate component name'});result.valid=false;return result;}
    for(const block of result.page.components){
      try{requirePagePropertyContract(block.type,block.properties);}
      catch(error){
        result.issues.push({row:1,component_name:block.id,component_property:'pagePropertyContract',
          remark:error instanceof Error?error.message:'Invalid Page property contract'});
      }
    }
    if(result.issues.length){result.valid=false;return result;}
    try{await validatePageComponentContracts(db,tenant,result.page.components,variant);}
    catch(error){
      result.issues.push({row:1,component_name:'',component_property:'',
        remark:error instanceof Error?error.message:'Invalid component metadata'});
      result.valid=false;
    }
    return result;
  };
  app.get('/api/metadata/pages/:apiName/layouts/:variant/versions/:version',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','read');
    const version=Number(req.params.version);
    if(!Number.isSafeInteger(version)||version<1)throw new Error('Invalid page revision');
    res.setHeader('Cache-Control','private, no-store');
    res.json({page:await pages.version(actor.tenant_id,name,pageLayoutVariant(req.params.variant),version)});
  }));
  app.post('/api/metadata/pages/:apiName/layouts/:variant/versions/:version/copy',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await assertMetadataPackageEditable(db,actor.tenant_id,'page',name);
    const version=Number(req.params.version);
    if(!Number.isSafeInteger(version)||version<1)throw new Error('Invalid page revision');
    res.setHeader('Cache-Control','private, no-store');
    res.json({page:await pages.copyLayoutVersion(actor.tenant_id,name,
      pageLayoutVariant(req.params.variant),version,actor.user_id)});
  }));
  app.patch('/api/metadata/pages/:apiName/layouts/:variant/versions/:version/archive',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await assertMetadataPackageEditable(db,actor.tenant_id,'page',name);
    const version=Number(req.params.version),archived=req.body?.archived;
    if(!Number.isSafeInteger(version)||version<1||typeof archived!=='boolean')
      throw new Error('Invalid Page version archive request');
    const versions=await pages.archiveLayout(actor.tenant_id,name,pageLayoutVariant(req.params.variant),
      version,archived,actor.user_id);
    res.setHeader('Cache-Control','private, no-store');
    res.json({versions});
  }));
  app.get('/api/metadata/pages/:apiName/component-name-history',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','read');
    const stem=String(req.query.stem??'');
    if(!/^[a-z][a-z0-9]{0,63}$/.test(stem))throw Error('Invalid component name prefix');
    const result=await db.query<{last:string}>(`
      SELECT COALESCE(MAX(SUBSTRING(LOWER(v.value_text) FROM LENGTH($3::text)+1)::bigint),0)::text AS last
      FROM md_page_layout_version_properties v
      JOIN md_page_definitions p ON p.tenant_id=v.tenant_id AND p.id=v.page_id
      WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true
        AND v.property_path='/props/navigatorName'
        AND LOWER(v.value_text) ~ ('^'||$3||'[0-9]{1,9}$')`,
      [actor.tenant_id,name,stem]);
    res.setHeader('Cache-Control','private, no-store');
    res.json({last:Number(result.rows[0]?.last??0)});
  }));
  // Read saved draft component metadata, never a browser-local or published runtime approximation.
  app.get('/api/metadata/pages/:apiName/inventory',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','read');
    const variant=pageLayoutVariant(req.query.variant??'Desktop');
    const page=await pages.editor(actor.tenant_id,name,variant) as unknown as InventoryPage;
    const definitions=await inventoryDefinitions(db,actor.tenant_id,page.components,variant);
    res.setHeader('Cache-Control','private, no-store');
    res.json({csv:exportInventoryCsv(page,definitions),variant,draftRevision:page.draftRevision??0});
  }));
  // Validate every row before touching SQL. The same checks are repeated on apply.
  app.post('/api/metadata/pages/:apiName/inventory/validate',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await assertMetadataPackageEditable(db,actor.tenant_id,'page',name);
    const variant=pageLayoutVariant(req.body?.variant??'Desktop');
    if(variant!=='Desktop')throw Error('CSV upload is supported only for the Desktop page layout');
    const csv=typeof req.body?.csv==='string'?req.body.csv:'';
    const page=await pages.editor(actor.tenant_id,name,variant) as unknown as InventoryPage;
    const definitions=await inventoryDefinitions(db,actor.tenant_id,page.components,variant,inventoryRequestedTypes(csv));
    const result=await preflightInventory(actor.tenant_id,variant,
      applyInventoryCsv(page,csv,definitions));
    res.setHeader('Cache-Control','private, no-store');
    res.json({valid:result.valid,issues:result.issues,changes:result.changes,skipped:result.skipped,
      draftRevision:page.draftRevision??0});
  }));
  app.post('/api/metadata/pages/:apiName/inventory/apply',wrap(async(req,res)=>{
    const actor=authenticated(req),name=req.params.apiName;
    if(!api.test(name))throw new Error('Invalid Page API name');
    await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
    await assertMetadataPackageEditable(db,actor.tenant_id,'page',name);
    const variant=pageLayoutVariant(req.body?.variant??'Desktop');
    if(variant!=='Desktop')throw Error('CSV upload is supported only for the Desktop page layout');
    const expected=req.body?.expectedDraftRevision;
    if(!Number.isSafeInteger(expected)||expected<0)throw new Error('Invalid expected draft revision');
    const page=await pages.editor(actor.tenant_id,name,variant) as unknown as InventoryPage;
    if((page.draftRevision??0)!==expected)throw new Error('Page layout changed since CSV validation. Validate the file again.');
    const csv=typeof req.body?.csv==='string'?req.body.csv:'';
    const definitions=await inventoryDefinitions(db,actor.tenant_id,page.components,variant,inventoryRequestedTypes(csv));
    const result=await preflightInventory(actor.tenant_id,variant,
      applyInventoryCsv(page,csv,definitions));
    res.setHeader('Cache-Control','private, no-store');
    if(!result.valid){res.json({valid:false,issues:result.issues,changes:0,skipped:result.skipped});return;}
    if(!result.changes){res.json({valid:true,issues:[],changes:0,skipped:result.skipped,page});return;}
    // saveLayoutDraft is transactional, audits the user and checks draftRevision under a lock.
    // A rejected property or concurrent edit leaves the existing saved page unchanged.
    const saved=await pages.saveLayoutDraft(actor.tenant_id,name,variant,result.page,actor.user_id);
    res.json({valid:true,issues:[],changes:result.changes,skipped:result.skipped,page:saved});
  }));
  registerPageDetailsController(app,db,rbac);

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
