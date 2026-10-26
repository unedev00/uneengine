import test from 'node:test';
import assert from 'node:assert/strict';
import type {PoolClient} from 'pg';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {RecordListViewService} from '../../src/system-support/record-list-view-service.js';
import {readFileSync} from 'node:fs';

const id='123e4567-e89b-42d3-a456-426614174000';
const row={id,object_api:'Account',owner_id:'user',label:'High Value',
  visibility:'private' as const,scope:'all' as const,filter_logic:'1',
  sort_field:'Name',sort_direction:'asc' as const,pinned:false};

test('list view save persists relational filters and requests the record field permission',async()=>{
  const writes:Array<{sql:string;args:unknown[]}>= [];
  const db={
    query:async(sql:string)=>{
      if(sql.includes('FROM md_field_definitions'))return {rows:[
        {api_name:'Name',data_type:'text',rollup_source_data_type:null},
      ]};
      throw new Error('Unexpected database query: '+sql);
    },
    transaction:async<T>(work:(client:PoolClient)=>Promise<T>)=>work({
      query:async(sql:string,args:unknown[]=[])=>{
        writes.push({sql,args});
        if(sql.includes('INSERT INTO md_list_views'))return {rows:[{id}],rowCount:1};
        if(sql.includes('SELECT v.id,v.object_api'))return {rows:[row]};
        if(sql.includes('SELECT field_api,phone_role FROM md_list_view_columns'))return {rows:[{field_api:'Name',phone_role:'title'}]};
        if(sql.includes('SELECT position,field_api,operator,value_text'))return {rows:[
          {position:0,field_api:'Name',operator:'contains',value_text:'Acme'},
        ]};
        return {rows:[],rowCount:1};
      },
    } as unknown as PoolClient),
  } as unknown as SqlPersistence;
  const grants:string[]=[];
  const rbac={require:async(_tenant:string,_user:string,resource:string,action:string)=>{
    grants.push(`${resource}.${action}`);
  }} as unknown as RbacEngine;
  const service=new RecordListViewService(db,rbac);
  const saved=await service.save('tenant','user','Account',{
    label:'High Value',visibility:'private',scope:'all',columns:['Name'],phoneRoles:{Name:'title'},
    filters:[{field:'Name',operator:'contains',value:'Acme'}],filterLogic:'1',
    sortField:'Name',sortDirection:'asc',
  });
  assert.equal(saved.id,id);
  assert.deepEqual(saved.columns,['Name']);
  assert.deepEqual(saved.phoneRoles,{Name:'title'});
  assert.deepEqual(saved.filters,[{field:'Name',operator:'contains',value:'Acme'}]);
  assert.ok(grants.includes('Account.Name.read'));
  assert.ok(writes.some(write=>write.sql.includes('INSERT INTO md_list_view_filters')));
  assert.ok(writes.some(write=>write.sql.includes('INSERT INTO md_list_view_columns')
    && write.args[4]==='title'));

});

test('list view sharing requires object manage permission',async()=>{
  const db={query:async()=>({rows:[]})} as unknown as SqlPersistence;
  const rbac={require:async(_tenant:string,_user:string,_resource:string,action:string)=>{
    if(action==='manage')throw new Error('Not authorized');
  }} as unknown as RbacEngine;
  const service=new RecordListViewService(db,rbac);
  await assert.rejects(()=>service.save('tenant','user','Account',{
    label:'Shared',visibility:'all',scope:'all',columns:[],filters:[],
  }),/Not authorized/);
});


test('saved list phone roles reject duplicates, disallowed fields and unrecognised roles',async()=>{
  const db={query:async()=>({rows:[{api_name:'Name',data_type:'text',rollup_source_data_type:null},
    {api_name:'Status',data_type:'text',rollup_source_data_type:null}]})} as unknown as SqlPersistence;
  const rbac={require:async()=>{}} as unknown as RbacEngine;
  const service=new RecordListViewService(db,rbac);
  const base={label:'Phone',visibility:'private' as const,scope:'all' as const,
    columns:['Name','Status'],filters:[]};
  await assert.rejects(()=>service.save('tenant','user','Account',{
    ...base,phoneRoles:{Name:'title',Status:'title'}
  }),/Invalid phone column roles/);
  await assert.rejects(()=>service.save('tenant','user','Account',{
    ...base,phoneRoles:{Other:'subtitle'}
  }),/Invalid phone column roles/);
  await assert.rejects(()=>service.save('tenant','user','Account',{
    ...base,phoneRoles:{Name:'unknown' as never}
  }),/Invalid phone column roles/);
});

test('record list widths are scoped by user and validated through OneEngine',async()=>{
  const calls:Array<{sql:string;args:unknown[]}>=[];
  const db={query:async(sql:string,args:unknown[]=[])=>{
    calls.push({sql,args});
    if(sql.includes('FROM md_field_definitions'))return {rows:[
      {api_name:'Name'},{api_name:'Phone'}
    ]};
    if(sql.includes('SELECT split_width_px,column_widths'))return {
      rows:[{split_width_px:520,column_widths:{Name:210}}]
    };
    return {rows:[],rowCount:1};
  }} as unknown as SqlPersistence;
  const grants:string[]=[];
  const rbac={require:async(_tenant:string,_user:string,resource:string,action:string)=>{
    grants.push(resource+'.'+action);
  }} as unknown as RbacEngine;
  const service=new RecordListViewService(db,rbac);
  const settings=await service.savePreferences('tenant-a','actor-b','Account',{
    splitWidthPx:520,columnWidths:{Name:210,Phone:140}
  });
  assert.deepEqual(settings,{splitWidthPx:520,columnWidths:{Name:210,Phone:140}});
  assert.ok(grants.includes('Account.read'));
  assert.ok(grants.includes('Account.Name.read'));
  assert.ok(grants.includes('Account.Phone.read'));
  const write=calls.find(call=>call.sql.includes('INSERT INTO md_record_view_preferences'));
  assert.deepEqual(write?.args.slice(0,3),['tenant-a','actor-b','Account']);
  assert.deepEqual(await service.preferences('tenant-a','actor-b','Account'),{
    splitWidthPx:520,columnWidths:{Name:210}
  });
  await assert.rejects(()=>service.savePreferences('tenant-a','actor-b','Account',{
    splitWidthPx:240,columnWidths:{Name:210}
  }),/Invalid view preferences/);
  await assert.rejects(()=>service.savePreferences('tenant-a','actor-b','Account',{
    splitWidthPx:520,columnWidths:{Secret:180}
  }),/Invalid view preference field/);
  await assert.rejects(()=>service.savePreferences('tenant-a','actor-b','Account',{
    splitWidthPx:520,columnWidths:{Name:900}
  }),/Invalid view preferences/);
});
test('record presentation migration uses additive tenant/user relational keys',()=>{
  const migration=readFileSync(new URL('../../src/system-support/migrations/20270103-record-view-preferences.sql',import.meta.url),'utf8');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS md_record_view_preferences/);
  assert.match(migration,/PRIMARY KEY\(tenant_id,user_id,object_api\)/);
  assert.match(migration,/CHECK\(split_width_px BETWEEN 320 AND 800\)/);
});
