import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SchemaBuilder from '../src/core/builders/SchemaBuilder/SchemaBuilder';
import {appRoutePathWithoutBase} from '../src/core/workspace/Navigation/appRouting';
import type {ObjectMetadata} from '../src/core/metadata/Definitions/metadata';

const objects=[
  {apiName:'Account',label:'Account',kind:'Standard Object',
   fields:[{apiName:'Name',label:'Name',dataType:'Text',required:true},
     {apiName:'Owner',label:'Owner',dataType:'Lookup(User)',
      relationship:{type:'Lookup',targetObject:'User'}}]},
  {apiName:'User',label:'User',kind:'Standard Object',
   fields:[{apiName:'Name',label:'Name',dataType:'Text'}]}
] as unknown as ObjectMetadata[];

test('Schema Builder exposes selected object creation and existing field editor links',()=>{
  const html=renderToStaticMarkup(createElement(SchemaBuilder,{
    objects,selectedObjectApiName:'Account',
    onOpenObject:()=>undefined,onOpenField:()=>undefined,
    onNewField:()=>undefined,onCreateObject:()=>undefined
  }));
  assert.match(html,/New Field on Selected Object/);
  assert.match(html,/Add relationship from Account/);
  assert.match(html,/Master-Detail/);
  assert.match(html,/Related object/);
  assert.match(html,/View \/ Edit/);
  assert.match(html,/View Name field configuration/);
  assert.match(html,/View Owner field configuration/);
  assert.match(html,/Configure relationship/);
});

test('Schema Builder disables relationship creation until a target is chosen',()=>{
  const html=renderToStaticMarkup(createElement(SchemaBuilder,{
    objects,selectedObjectApiName:'Account',
    onOpenObject:()=>undefined,onOpenField:()=>undefined,
    onNewField:()=>undefined,onCreateObject:()=>undefined
  }));
  assert.match(html,/<button[^>]*disabled=""[^>]*>Configure relationship<\/button>/);
});

test('Object Manager field detail links serialize a target field resource',()=>{
  const path=appRoutePathWithoutBase({kind:'setup',workspace:'object-manager',
    objectApiName:'Account',setting:'Fields & Relationships',resourceApiName:'Owner'});
  assert.equal(path,'/une/setup/object-manager/Account/FieldsAndRelationships/Owner');
});
