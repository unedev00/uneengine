import assert from 'node:assert/strict';
const built=new URL('../dist-system/system-files/',import.meta.url);
export async function createRecordParityFixture(db,tenantId,userId){
 const [{ObjectDefinitionService},{RecordEngine},{RbacEngine},{PageRuntime}]=await Promise.all(
  ['object-definition.js','record-engine.js','rbac-engine.js','page-runtime.js'].map(file=>import(new URL(file,built).href)));
 const definitions=new ObjectDefinitionService(db),records=new RecordEngine(db,new RbacEngine(db)),pages=new PageRuntime(db);
 const field=(apiName,dataType,extra={})=>({apiName,label:apiName,dataType,...extra});
 await definitions.create(tenantId,'ParityParent__c','Parity Parent',[
  field('Name','Text(80)',{required:true}),field('Address','Address'),field('Location','Geolocation'),field('Secret','Text(80)')]);
 await definitions.create(tenantId,'ParityChild__c','Parity Child',[
  field('Name','Text(80)',{required:true}),field('Status','Picklist',{picklistValues:['Open','Closed']}),
  field('Parent__c','Reference',{relationship:{targetObject:'ParityParent__c',type:'Lookup',childRelationshipName:'Children',relationshipName:'Parent'}})]);
 const parentId=await records.create(tenantId,userId,'ParityParent__c',{Name:'Parity parent',Secret:'Do not display'});
 const other=await records.create(tenantId,userId,'ParityParent__c',{Name:'Other parent'});
 for(const [name,status,parent] of [['First','Open',parentId],['Second','Open',parentId],['Closed child','Closed',parentId],['Unrelated','Open',other]])
  await records.create(tenantId,userId,'ParityChild__c',{Name:name,Status:status,Parent__c:parent});
 const block=(id,type,properties={},visible=true)=>({id,type,label:id,visible,region:'main',properties});
 const nodes=[block('Record fields','Field Section',{fieldApiNames:['Name','Address','Location'],columns:2}),
  block('hidden','Container',{},false),block('hidden-field','Record Field',{fieldApiName:'Secret',layoutParentId:'hidden'}),
  block('links','Related List Quick Links',{relatedLists:['Children']}),
  block('open','Related List',{relatedLists:['Children'],relatedListSettings:{Children:{columns:['Name','Status'],pageSize:1,filterField:'Status',filterValue:'Open',showRowActions:true}}}),
  block('closed','Related List',{relatedLists:['Children'],relatedListSettings:{Children:{columns:['Name','Status'],pageSize:1,filters:[{field:'Status',operator:'Equals',value:'Closed'}],showRowActions:true}}})];
 for(const mode of ['View','Edit']){
  const components=mode==='View'?nodes:[block('Edit container','Container'),
   block('Edit fields','Field Section',{fieldApiNames:['Name','Address','Location'],columns:1,layoutParentId:'Edit container'}),
   block('hidden','Container',{},false),block('hidden-field','Record Field',{fieldApiName:'Secret',layoutParentId:'hidden'})];
  const apiName='Parity_'+mode;
  await pages.save(tenantId,apiName,{apiName,label:apiName,pageType:'Record Page',recordMode:mode,targetObject:'ParityParent__c',
   status:'Active',layoutMode:'template',template:'Header and One Region',canvasWidth:1440,canvasHeight:900,devices:['Desktop','Phone'],components,
   activationAssignments:[{id:'org-default',scope:'Org Default',formFactors:['Desktop','Phone','Tablet','Custom']}]});
 }
 return {parentId,records,tenantId,userId};
}
export async function runRecordParityBrowser(page,origin,fixture){
 const {parentId,records,tenantId,userId}=fixture;
 await page.goto(origin+'/une/r/ParityParent__c/'+parentId+'/view',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Edit Address',exact:true}).waitFor({timeout:20000});
 assert.equal(await page.getByText('Do not display',{exact:true}).count(),0);
 const open=page.locator('[id="related-open:Children"]'),closed=page.locator('[id="related-closed:Children"]');
 await open.getByText('2 records',{exact:true}).waitFor();
 await closed.getByText('Closed child',{exact:true}).waitFor();
 assert.equal(await page.getByText('Unrelated',{exact:true}).count(),0);
 await open.getByRole('button',{name:'Next',exact:true}).click();
 await open.getByText('Page 2 of 2',{exact:true}).waitFor();
 await closed.getByText('Page 1 of 1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Preview Children',exact:true}).click();
 await page.getByRole('region',{name:'Children preview'}).getByText('3 records',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Preview Children',exact:true}).press('Escape');
 await page.getByRole('button',{name:'Edit Address',exact:true}).click();
 const street=page.getByRole('textbox',{name:'Address Street',exact:true});
 await street.fill('10 Parity Street');
 await page.locator('.record-inline-field, .record-form-inline').filter({has:street}).getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('button',{name:'Edit Address',exact:true}).waitFor();
 const saved=await records.get(tenantId,userId,'ParityParent__c',parentId);
 assert.equal(saved.Address.street,'10 Parity Street');
 // Editing one field must not rewrite another field or hidden data.
 assert.equal(saved.Name,'Parity parent');assert.equal(saved.Secret,'Do not display');
 await closed.getByRole('button',{name:'Actions',exact:true}).click();
 await closed.getByRole('button',{name:'Edit',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.locator('input[name="Name"]').fill('Renamed child');
 await dialog.getByRole('button',{name:'Save',exact:true}).click();
 await closed.getByText('Renamed child',{exact:true}).waitFor();
 console.info('Record parity browser: hidden ancestors, independent filtered paging, Quick Links, compound inline saves and related editing passed');
}
