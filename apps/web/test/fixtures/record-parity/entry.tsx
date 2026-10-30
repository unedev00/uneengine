import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import RecordInlineEditor from '../../../src/core/records/RecordWorkspace/RecordInlineEditor';
import RelatedQuickLink from '../../../src/core/records/RecordWorkspace/RelatedQuickLink';
const f=(apiName:string,dataType:string,extra={})=>({apiName,label:apiName,dataType,required:false,unique:false,...extra});
const fields=[f('Address','Address'),f('Location','Geolocation'),f('Moment','Date/Time'),f('Tags','Multi-Select Picklist',{picklistValues:['One','Two']}),f('Controller','Picklist',{picklistValues:['A','B']}),f('Dependent','Picklist',{picklistValues:['A1','B1'],controllerFieldApiName:'Controller',valueSettings:{A:['A1'],B:['B1']}}),f('Parent','Reference',{relationship:{type:'Lookup',targetObject:'Parent',childRelationshipName:'Children'}}),f('Protected','Text',{required:true})];
const object:any={apiName:'Example',label:'Example',pluralLabel:'Examples',fields,recordTypes:[],actions:[],pageLayouts:[]};
const parent:any={apiName:'Parent',label:'Parent',pluralLabel:'Parents',fields:[f('Name','Text')]};
const access=Object.fromEntries(fields.map(field=>['Example.'+field.apiName,{read:true,edit:field.apiName!=='Protected'}]));
function App(){
 const [record,setRecord]=useState<any>({Id:'record-1',Controller:'A',Dependent:'A1',Protected:'Keep',Moment:'2026-10-30T12:34:56Z'});
 const [saved,setSaved]=useState({});
 return <><output data-testid="saved">{JSON.stringify(saved)}</output>{fields.map(field=><section key={field.apiName} aria-label={field.apiName}>
  <RecordInlineEditor field={field} object={object} objects={[object,parent]} record={record} profileId="test" fieldAccess={access}
    userRoles={[]} lookupRecords={{Parent:[{Id:'parent-1',Name:'Parent one'}]}}
    searchLookupRecords={async()=>[{Id:'parent-2',Name:'Parent two'}]} display={JSON.stringify(record[field.apiName]??null)}
    editable={access['Example.'+field.apiName].edit} onSave={async patch=>{setSaved(patch);setRecord((previous:any)=>({...previous,...patch}));}}/>
 </section>)}<RelatedQuickLink label="Children" total={3} onJump={()=>{}}><span>Preview records</span></RelatedQuickLink></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
