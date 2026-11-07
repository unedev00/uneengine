import {readRetiredMigration} from '../../../../scripts/read-retired-migration.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createDeviceComponentOverrides,applyDeviceComponentOverrides,type InheritedComponent}
 from '../../src/system-files/page-layout-device-inheritance.js';

const node=(id:string,properties:Record<string,unknown>,extra:Record<string,unknown>={})
 :InheritedComponent=>({id,type:'Custom:smart_calendar',label:id,region:'main',visible:true,properties,...extra});

test('Mobile changes only one visual property; future Desktop changes still propagate',()=>{
 const desktop=[node('calendar',{backgroundColor:'#ffffff',borderColor:'#000000',textSize:14,
  actionFlows:{click:{flowApiName:'SharedFlow'}}})];
 const mobile=[node('calendar',{...desktop[0].properties,backgroundColor:'#0000ff'})];
 const delta=createDeviceComponentOverrides(desktop,mobile);
 assert.equal(delta.length,1);
 assert.deepEqual(delta[0].properties,{backgroundColor:'#0000ff'});
 const updated=[node('calendar',{...desktop[0].properties,borderColor:'#ff0000',textSize:16}),
  node('new-component',{backgroundColor:'#123456'})];
 const effective=applyDeviceComponentOverrides(updated,delta);
 assert.equal(effective[0].properties.backgroundColor,'#0000ff');
 assert.equal(effective[0].properties.borderColor,'#ff0000');
 assert.equal(effective[0].properties.textSize,16);
 assert.deepEqual(effective[0].properties.actionFlows,desktop[0].properties.actionFlows);
 assert.equal(effective[1].id,'new-component');
 assert.ok(!('__deviceLayout' in effective[0]));
});

test('Data and action wiring stay shared even if a device submits changed values',()=>{
 const parent=[node('calendar',{backgroundColor:'white',actionFlows:{click:'SharedFlow'},
  objectApiName:'Calendar',bindFormula:'$state.selected'})];
 const mobile=[node('calendar',{backgroundColor:'blue',actionFlows:{click:'MobileFlow'},
  objectApiName:'DifferentObject',bindFormula:'$state.selected'})];
 const delta=createDeviceComponentOverrides(parent,mobile,new Set(['bindFormula']));
 assert.deepEqual(delta[0].properties,{backgroundColor:'blue'});
 const effective=applyDeviceComponentOverrides(parent,delta);
 assert.equal(effective[0].properties.objectApiName,'Calendar');
 assert.deepEqual(effective[0].properties.actionFlows,{click:'SharedFlow'});
 assert.equal(effective[0].properties.backgroundColor,'blue');
});

test('Tablet and Custom inherit parent by default; an override can be reset',()=>{
 const desktop=[node('calendar',{backgroundColor:'white',borderColor:'black'})];
 assert.deepEqual(createDeviceComponentOverrides(desktop,desktop),[]);
 assert.deepEqual(applyDeviceComponentOverrides(desktop,[]),desktop);
 const tablet=[node('calendar',{backgroundColor:'blue',borderColor:'black'})];
 const override=createDeviceComponentOverrides(desktop,tablet);
 assert.equal(applyDeviceComponentOverrides(desktop,override)[0].properties.backgroundColor,'blue');
 const reset=createDeviceComponentOverrides(desktop,desktop);
 assert.equal(reset.length,0);
 assert.equal(applyDeviceComponentOverrides(desktop,reset)[0].properties.backgroundColor,'white');
});

test('Child may hide, rearrange, remove or add presentation nodes without modifying Desktop',()=>{
 const desktop=[node('first',{color:'black'}, {position:{x:5,y:3,width:200,height:60}}),
  node('second',{color:'red'})];
 const mobile=[{...structuredClone(desktop[1]),visible:false},
  node('mobile-only',{color:'blue'})];
 const delta=createDeviceComponentOverrides(desktop,mobile);
 const effective=applyDeviceComponentOverrides(desktop,delta);
 assert.deepEqual(effective.map(c=>c.id),['second','mobile-only']);
 assert.equal(effective[0].visible,false);
 assert.equal(desktop[0].visible,true);
 assert.deepEqual(desktop.map(c=>c.id),['first','second']);
});

test('Deep overrides do not freeze unchanged nested properties or lose explicit clears',()=>{
 const original=[node('box',{layoutStyle:{backgroundColor:'white',borderWidth:1,hidden:false},
  style:{labelColor:'black'}})];
 const custom=[node('box',{layoutStyle:{backgroundColor:'blue',hidden:false},
  style:{labelColor:'black'}})];
 const changes=createDeviceComponentOverrides(original,custom);
 const next=[node('box',{layoutStyle:{backgroundColor:'green',borderWidth:8,hidden:true},
  style:{labelColor:'red'}})];
 const applied=applyDeviceComponentOverrides(next,changes);
 assert.deepEqual(applied[0].properties.layoutStyle,{backgroundColor:'blue',hidden:true});
 assert.deepEqual(applied[0].properties.style,{labelColor:'red'});
});

test('Desktop parent draft/publish separation is enforced by the SQL runtime',()=>{
 const path=new URL('../../src/system-files/page-layout-version-runtime.ts',import.meta.url);
 const service=readFileSync(path,'utf8');
 const migration=readRetiredMigration('20270211-page-device-inheritance.sql');
 assert.match(migration,/inherits_desktop boolean NOT NULL DEFAULT false/);
 assert.match(service,/view==='draft'\?desktopHeads\[0\]\?\.draft_version:desktopHeads\[0\]\?\.published_version/);
 assert.match(service,/Desktop parent changed; reload this device layout before saving/);
 assert.match(service,/createDeviceComponentOverrides/);
 assert.match(service,/applyDeviceComponentOverrides/);
});

test('Clearing inherited extra position removes the field rather than resurrecting the Desktop value',()=>{
 const desktop=[node('a',{backgroundColor:'white'},{
  position:{x:20,y:30,width:300,height:180},someOtherExtra:{keep:true}
 })];
 const edited=[node('a',{backgroundColor:'white'},{someOtherExtra:{keep:true}})];
 const delta=createDeviceComponentOverrides(desktop,edited);
 const effective=applyDeviceComponentOverrides(desktop,delta);
 assert.equal('position' in effective[0],false);
 assert.deepEqual(effective[0].someOtherExtra,{keep:true});
 assert.deepEqual(desktop[0].position,{x:20,y:30,width:300,height:180});
});
