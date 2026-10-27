import assert from 'node:assert/strict';
import test from 'node:test';
import {seedPublishedAppPackage} from '../../src/app-seeders/published-app-package.js';

test('published package assigns its declared Home Page without replacing an existing assignment',async()=>{
  const statements:Array<{sql:string;params:unknown[]}>=[];
  const client={
    async query(sql:string,params:unknown[]=[]){
      statements.push({sql,params});
      if(sql.includes('FROM md_app_package_page_templates'))return {rows:[],rowCount:0};
      if(sql.includes('FROM md_app_package_home_page_templates'))
        return {rows:[{page_api:'AcetillRegister',form_factor:'desktop'}],rowCount:1};
      if(sql.includes('SELECT id FROM md_page_definitions'))
        return {rows:[{id:'tenant-home-page'}],rowCount:1};
      if(sql.includes('FROM md_app_package_object_templates')
        ||sql.includes('FROM md_app_package_field_templates')
        ||sql.includes('FROM md_app_package_component_templates')
        ||sql.includes('FROM md_app_package_page_component_templates')
        ||sql.includes('FROM md_app_package_page_property_templates'))
        return {rows:[],rowCount:0};
      return {rows:[],rowCount:1};
    }
  };
  await seedPublishedAppPackage(client as never,'tenant-1','app-1',1);
  const insert=statements.find(item=>item.sql.includes('INSERT INTO md_app_home_pages'));
  assert.ok(insert);
  assert.match(insert.sql,/ON CONFLICT\(tenant_id,app_id,form_factor\) DO NOTHING/);
  assert.deepEqual(insert.params,['tenant-1','app-1','desktop','tenant-home-page']);
});

test('older package templates resolve trusted One identities to UNE and retain authored properties',async()=>{
 const statements:Array<{sql:string;params:unknown[]}>= [];
 const client={
  async query(sql:string,params:unknown[]=[]){
   statements.push({sql,params});
   if(sql.includes('FROM md_app_package_component_templates'))
    return {rows:[
     {api_name:'OneText',renderer_key:'one-bundled:OneText'},
     {api_name:'OneBadge',renderer_key:'tenant-renderer'}
    ],rowCount:2};
   if(sql.includes('SELECT renderer_key,enabled FROM md_component_definitions'))
    return {rows:[{renderer_key:'one-bundled:une_text',enabled:true}],rowCount:1};
   if(sql.includes('FROM md_app_package_page_component_templates'))
    return {rows:[{page_api:'OldPage',component_api:'OneText',slot:'main',sort_order:1}],rowCount:1};
   if(sql.includes('FROM md_app_package_page_property_templates'))
    return {rows:[{page_api:'OldPage',component_api:'OneText',slot:'main',sort_order:1,
      property_path:'text',data_type:'string',value_text:'Keep my text',
      reference_kind:null,reference_api:null,reference_parent_api:null}],rowCount:1};
   if(sql.includes('SELECT id FROM md_page_definitions'))
    return {rows:[{id:'page-one'}],rowCount:1};
   if(sql.includes('SELECT api_name FROM md_component_definitions'))
    return {rows:[{api_name:params[1]}],rowCount:1};
   if(sql.includes('SELECT part.id FROM md_page_components'))
    return {rows:[{id:'part-one'}],rowCount:1};
   if(sql.includes('FROM md_app_package_seed_receipts'))
    return {rows:[],rowCount:0};
   if(sql.includes('FROM md_app_package_object_templates')||
      sql.includes('FROM md_app_package_field_templates')||
      sql.includes('FROM md_app_package_page_templates')||
      sql.includes('FROM md_app_package_home_page_templates'))
    return {rows:[],rowCount:0};
   return {rows:[],rowCount:1};
  }
 };
 await seedPublishedAppPackage(client as never,'tenant-1','app-1',1);
 assert.ok(statements.some(x=>x.sql.includes('SELECT renderer_key,enabled')&&x.params[1]==='une_text'));
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_component_definitions')
   &&x.params[1]==='OneText'));
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_component_definitions')
   &&x.params[1]==='OneBadge'&&x.params[2]==='tenant-renderer'));
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_page_components')
   &&x.params[2]==='une_text'));
 assert.ok(statements.some(x=>x.sql.includes('SELECT part.id FROM md_page_components')
   &&x.params[2]==='une_text'));
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_page_component_properties')
   &&x.params[3]==='Keep my text'));
});
