import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldType,safeField,serializeChangedFields} from '../../mobile/src/lib/recordFormValues.mjs';

const fld=(apiName,dataType,extra={})=>({apiName,label:apiName,dataType,
 required:false,canCreate:true,canEdit:true,...extra});
test('edits only changed permitted fields; does not rewrite inaccessible or unchanged data',()=>{
 const fields=[fld('Name','Text'),fld('Amount','Currency'),fld('Protected','Text',{canEdit:false})];
 assert.deepEqual(serializeChangedFields(fields,{Name:'Changed',Amount:15,Protected:'secret'},
  new Set(['Name','Protected']),'edit'),{Name:'Changed'});
});
test('creation enforces required values and normalises server types',()=>{
 const fields=[fld('Name','Text',{required:true}),fld('Active','Checkbox',{dataType:'boolean'}),
  fld('Amount','Number'),fld('Tags','multipicklist')];
 assert.throws(()=>serializeChangedFields(fields,{Name:''},new Set(),'create'),/Name is required/);
 assert.deepEqual(serializeChangedFields(fields,{Name:' Alice ',Active:true,Amount:'3.50',Tags:'A;B'},
   new Set(),'create'),{Name:'Alice',Active:true,Amount:3.5,Tags:'A;B'});
});
test('encrypted edit value is not included unless explicitly changed to non-empty',()=>{
 const fields=[fld('Secret','encryptedtext')];
 assert.throws(()=>serializeChangedFields(fields,{Secret:''},new Set(['Secret']),'edit'),/No editable changes/);
 assert.deepEqual(serializeChangedFields(fields,{Secret:'new secret'},new Set(['Secret']),'edit'),{Secret:'new secret'});
});
test('geolocation limits, address components and lookup IDs are validated',()=>{
 const fields=[fld('Location','geolocation'),fld('Address','address'),fld('ParentId','reference')];
 assert.throws(()=>serializeChangedFields(fields,{Location:{latitude:91,longitude:10}},new Set(),'create'),/latitude/);
 assert.throws(()=>serializeChangedFields(fields,{ParentId:'not-a-uuid'},new Set(),'create'),/valid ParentId/);
 const value={Location:{latitude:'51.5',longitude:'-0.15'},
   Address:{street:' High Rd ',postalCode:' E1 '},
   ParentId:'123e4567-e89b-42d3-a456-426614174000'};
 assert.deepEqual(serializeChangedFields(fields,value,new Set(),'create'),{
  Location:{latitude:51.5,longitude:-0.15},
  Address:{street:'High Rd',city:'',state:'',postalCode:'E1',country:''},
  ParentId:value.ParentId
 });
});
test('read-only formula fields cannot be included even if marked writable',()=>{
 const field=fld('Calculated','Formula');
 assert.equal(safeField(field,'edit'),false);
 assert.equal(fieldType(field),'formula');
 assert.throws(()=>serializeChangedFields([field],{Calculated:'tamper'},new Set(['Calculated']),'edit'),
  /No editable changes/);
});
