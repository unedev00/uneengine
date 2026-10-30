import test from 'node:test';
import assert from 'node:assert/strict';
import type {ObjectMetadata} from '../src/core/metadata/Definitions/metadata';
import {
 mentionGroups,resolveCollectionMentionRows
} from '../src/component-libraries/shared/primitives/SmartFieldInput/smartFieldMentions';

test('arbitrary three-object lookup path resolves per row and caches duplicate IDs',async()=>{
 const objects=[
  {apiName:'Entry',label:'Entry',fields:[{
    apiName:'ReferenceId',label:'Reference',dataType:'Lookup(Catalog)',
    relationship:{type:'Lookup',targetObject:'Catalog',relationshipName:'Reference',childRelationshipName:'Entries'}
  }]},
  {apiName:'Catalog',label:'Catalog',fields:[
    {apiName:'ImageUrl',label:'Image URL',dataType:'URL'},
    {apiName:'OwnerId',label:'Owner',dataType:'Lookup(Person)',
     relationship:{type:'Lookup',targetObject:'Person',relationshipName:'Owner',childRelationshipName:'Catalogs'}}
  ]},
  {apiName:'Person',label:'Person',fields:[
    {apiName:'Photo',label:'Photo',dataType:'URL'}
  ]}
 ] as unknown as ObjectMetadata[];
 const candidates=mentionGroups(objects,'Entry');
 assert.ok(candidates.some(group=>group.fields.some(field=>
   field.reference==='@Entry.Reference.Owner.Photo')));
 const records=[
  {Id:'a',ReferenceId:'item-1'},
  {Id:'b',ReferenceId:'item-1'},
  {Id:'c',ReferenceId:'missing'}
 ];
 let reads=0;
 const saved:Record<string,Record<string,unknown>>={
  'Catalog:item-1':{Id:'item-1',ImageUrl:'https://example.com/1.png',OwnerId:'person-1'},
  'Person:person-1':{Id:'person-1',Photo:'https://example.com/2.png'}
 };
 const rows=await resolveCollectionMentionRows(objects,'Entry',records,{
  imageSource:'@Entry.Reference.ImageUrl',
  textSource:'@Entry.Reference.Owner.Photo'
 },async(object,id)=>{
  reads++;
  return saved[object+':'+id];
 });
 assert.equal(rows.length,3);
 for(const row of rows.slice(0,2)){
  const mentions=row.__mentionValues as Record<string,unknown>;
  assert.equal(mentions['@Entry.Reference.ImageUrl'],'https://example.com/1.png');
  assert.equal(mentions['@Entry.Reference.Owner.Photo'],'https://example.com/2.png');
 }
 assert.equal((rows[2].__mentionValues as Record<string,unknown>)['@Entry.Reference.ImageUrl'],'');
 assert.equal(reads,3,'two rows sharing one lookup must not fetch it twice');
});
test('lookup suggestions are based on metadata, not special Product/User names',()=>{
 const objects=[
  {apiName:'Transaction',label:'Transaction',fields:[{
   apiName:'MemberId',label:'Member',dataType:'Lookup(Member)',
   relationship:{type:'Lookup',targetObject:'Member',relationshipName:'Member',childRelationshipName:'Transactions'}
  }]},
  {apiName:'Member',label:'Member',fields:[{apiName:'Avatar',label:'Avatar',dataType:'URL'}]}
 ] as unknown as ObjectMetadata[];
 const groups=mentionGroups(objects,'Transaction',[],'','image');
 assert.ok(groups.flatMap(g=>g.fields).some(f=>f.reference==='@Transaction.Member.Avatar'));
});
