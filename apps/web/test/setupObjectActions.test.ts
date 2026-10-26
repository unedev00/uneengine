import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSetupObjectActions} from '../src/core/builders/ObjectManager/setupObjectActions';

const fieldDraftSetters = [
  'setNewFieldType', 'setNewFieldStage', 'setNewFieldLabel', 'setNewFieldTextLength',
  'setNewFieldAutoNumberFormat', 'setNewFieldPrecision', 'setNewFieldScale',
  'setNewFieldDescription', 'setNewFieldHelpText', 'setNewFieldDefaultValue',
  'setNewFieldHasDefault', 'setNewFieldFormula', 'setNewFieldFormulaValidation',
  'setNewFieldPicklistValues', 'setNewFieldPicklistRestricted',
  'setNewFieldControllerApiName', 'setNewFieldValueSettings',
  'setNewFieldRelationshipTarget', 'setNewFieldRelationshipName',
  'setNewFieldChildRelationshipName', 'setNewFieldRollupChildObject',
  'setNewFieldRollupRelationshipField', 'setNewFieldRollupOperation',
  'setNewFieldRollupSourceField', 'setNewFieldDeleteBehavior',
  'setNewFieldAllowReparenting', 'setNewFieldLookupFilters',
  'setNewFieldLookupFilterLogic', 'setNewFieldRequired', 'setNewFieldUnique',
  'setNewFieldExternalId', 'setNewFieldCaseSensitive', 'setNewFieldLayoutIds'
];

test('resetting a new field draft clears rollup configuration', () => {
  const calls = new Map<string, unknown[]>();
  const setters = Object.fromEntries(fieldDraftSetters.map((name) => [
    name,
    (...values: unknown[]) => calls.set(name, values)
  ]));
  const actions = createSetupObjectActions({
    ...setters,
    object: {fields: []},
    newFieldLabel: '',
    newFieldPicklistValues: '',
    newFieldControllerApiName: ''
  });

  actions.resetNewFieldDraft();

  assert.deepEqual(calls.get('setNewFieldRollupChildObject'), ['']);
  assert.deepEqual(calls.get('setNewFieldRollupRelationshipField'), ['']);
  assert.deepEqual(calls.get('setNewFieldRollupOperation'), ['COUNT']);
  assert.deepEqual(calls.get('setNewFieldRollupSourceField'), ['']);
});

test('Object Manager field wizard generates tenant-local collision-safe suffix names',()=>{
  const ctx={object:{fields:[{apiName:'Revenue__c'},{apiName:'revenue_2__c'}]},
    newFieldLabel:'Revenue',newFieldPicklistValues:'',newFieldControllerApiName:'',
    newFieldType:'Text',newFieldTextLength:80,newFieldHasDefault:false,newFieldLookupFilters:[]};
  const actions=createSetupObjectActions(ctx);
  assert.equal(actions.newFieldApiName,'Revenue_3__c');
  assert.equal(actions.newFieldConfigurationError,'');
  const special=createSetupObjectActions({...ctx,newFieldLabel:'123 Purchase'});
  assert.equal(special.newFieldApiName,'Purchase__c');
  const invalid=createSetupObjectActions({...ctx,newFieldLabel:'!!'});
  assert.equal(invalid.newFieldApiName,'');
  assert.match(invalid.newFieldConfigurationError,/valid custom field name/);
});

test('Object Manager creates a unique suffix-preserving API name from a duplicate label',async()=>{
 const requests:Array<{apiName:string;label:string}>=[];
 const noop=()=>{};
 const ctx={
   object:{apiName:'Invoice__c',fields:[]},
   objects:[{apiName:'Invoice__c',label:'Invoice',fields:[]}],
   newObjectLabel:'123 Invoice',newObjectPluralLabel:'Invoices',newObjectDescription:'',
   newObjectRecordNameLabel:'Invoice Name',
   newObjectSettings:{recordNameType:'Text',recordNameFormat:''},
   launchCustomTabWizard:false,
   apiRequest:async(_url:string,init:{body:string})=>{
     const payload=JSON.parse(init.body);
     requests.push({apiName:payload.apiName,label:payload.label});
     return {object:{...payload,fields:payload.fields}};
   },
   setObjects:noop,setObject:noop,setObjectSetting:noop,navigateRoute:noop,
   setShowNewObject:noop,setNewObjectLabel:noop,setNewObjectPluralLabel:noop,
   setNewObjectDescription:noop,setNewObjectRecordNameLabel:noop,
   setLaunchCustomTabWizard:noop,setNewObjectSettings:noop,notify:noop,
   newFieldLabel:'',newFieldPicklistValues:'',newFieldControllerApiName:'',
   newFieldLookupFilters:[]
 };
 await createSetupObjectActions(ctx).createObject();
 assert.deepEqual(requests,[{apiName:'Invoice_2__c',label:'123 Invoice'}]);
});
