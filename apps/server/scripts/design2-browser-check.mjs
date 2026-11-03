import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

/** Real PostgreSQL + compiled Page Builder browser contract.
 * Uses only disposable CI tenant data from builder-browser-smoke.mjs.
 */
export async function runDesign2BrowserCheck({page,origin,db,tenantId,token}){
 const migration=await readFile(new URL('../src/system-support/migrations/20270309-design2-contextual-ribbon.sql',import.meta.url),'utf8');
 // Replay explicitly to validate upgrade idempotency, not just presence in source.
 await db.query(migration);
 await db.query(migration);
 const listed=await db.query(`SELECT area,slot_key,property_key,row_no,order_no,width_px,height_px
   FROM md_builder_design2_slots ORDER BY area_order,row_no,order_no`);
 assert.equal(listed.rows.length,106,'Design 2 SQL slots missing or duplicated after replay');
 assert.equal(new Set(listed.rows.map(row=>row.area)).size,10,'Wrong Design 2 area count');
 const slot=(area,key)=>listed.rows.find(row=>row.area===area&&row.slot_key===key);
 assert.equal(slot('Row','focused')?.property_key,'selectedRowColor');
 assert.equal(slot('Tabs','focused')?.property_key,'selectedTabColor');
 assert.equal(slot('Row','fill')?.property_key,null,'Row must inherit Table background');
 assert.equal(slot('Body','wrap')?.property_key,'wrapText','Body Wrap Text must remain disabled');
 const definitions=await db.query(`SELECT property_key,tab FROM md_builder_shared_properties
   WHERE property_key IN ('backgroundColor','rowBold','summary2Alignment','tableBackgroundColor')`);
 assert.equal(definitions.rows.find(row=>row.property_key==='backgroundColor')?.tab,'Design',
  'Original Design property moved during Design 2 migration');
 assert.equal(definitions.rows.find(row=>row.property_key==='rowBold')?.tab,'Design2');
 console.info('Design 2 SQL migration replay, legacy Design isolation and Focused mapping verified');
 await db.query(`INSERT INTO md_component_definitions (tenant_id,api_name,renderer_key,enabled)
 VALUES ($1,'smart_cart','one-bundled:smart_cart',true),
        ($1,'smart_tabs','one-bundled:smart_tabs',true)
 ON CONFLICT (tenant_id,api_name) DO NOTHING`,[tenantId]);

 // The real authenticated Builder Catalog endpoint must expose SQL slots and enforce RBAC.
 // Navigate to the compiled frontend before using browser-relative /api URLs.
 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async token=>{
  const response=await fetch('/api/metadata/builder-ribbon',{headers:{Authorization:'Bearer '+token}});
  return {status:response.status,body:await response.json()};
 },token);
 assert.equal(result.status,200,'OneEngine rejected authorised shared ribbon metadata');
 assert.equal(result.body.design2Slots?.length,106,'Builder endpoint did not expose Design 2 SQL metadata');
 // The catalog is SQL-backed but still protected by central OneEngine RBAC.
 const {AuthenticationService}=await import('../dist-system/system-files/authentication.js');
 const auth=new AuthenticationService(db);
 const guestHash=await auth.hashPassword('Design2LeastPrivilege!2026');
 const guest=await db.query(`INSERT INTO md_users(tenant_id,email,password_hash)
   VALUES($1,$2,$3) RETURNING id`,[tenantId,'design2-restricted@example.invalid',guestHash]);
 assert.ok(guest.rows[0]?.id);
 const guestToken=(await auth.signIn(tenantId,'design2-restricted@example.invalid',
  'Design2LeastPrivilege!2026')).accessToken;
 const forbidden=await page.evaluate(async token=>(await fetch('/api/metadata/builder-ribbon',{
  headers:{Authorization:'Bearer '+token}
 })).status,guestToken);
 assert.equal(forbidden,403,'Design 2 catalog bypassed OneEngine PageDefinition RBAC');

 // A persisted page with two real smart components, not mocked React widgets.
 const pageName='browserdesign2';
 const payload={
  apiName:pageName,label:'Design 2 Browser',targetObject:'',
  pageType:'App Page',layoutMode:'free-canvas',canvasWidth:1280,canvasHeight:900,
  status:'Draft',devices:['Desktop'],activationAssignments:[],
  components:[
   {id:'browser-design2-cart',type:'Custom:smart_cart',label:'E2E Cart',
    region:'main',visible:true,properties:{label:'E2E Cart',backgroundColor:'#ffffff',
     tableBackgroundColor:'#ffffff',rowBold:false,summaryTextWeight:false},
    position:{x:24,y:28,width:460,height:540}},
   {id:'browser-design2-tabs',type:'Custom:smart_tabs',label:'E2E Tabs',
    region:'main',visible:true,properties:{label:'E2E Tabs',tabCount:2,
     tabColor:'#ffffff',selectedTabColor:'#eaf2ff'},
    position:{x:530,y:28,width:510,height:90}}
  ]
 };
 const created=await page.evaluate(async({token,payload})=>{
  const response=await fetch('/api/metadata/pages/'+payload.apiName,{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
 },{token,payload});
 assert.equal(created.status,200,'Cannot seed Design 2 E2E page: '+JSON.stringify(created.body));

 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search pages').fill('Design 2 Browser');
 await page.getByRole('button',{name:'Design Design 2 Browser',exact:true}).click();
 await page.getByRole('tab',{name:'Design 2',exact:true}).waitFor({timeout:20000});

 // Select a real cart canvas component. The selected component is the editing target.
 const cart=page.locator('[data-component-id="browser-design2-cart"]').first();
 await cart.waitFor({state:'visible'});
 await cart.click({position:{x:18,y:18}});
 await page.getByRole('tab',{name:'Design 2',exact:true}).click();
 const design2=page.locator('.smart-design2-ribbon');
 await design2.waitFor({state:'visible'});
 const area=page.getByLabel('Select Design 2 area');
 assert.equal(await area.inputValue(),'Body');
 await area.selectOption('Row');
 const row=page.locator('.smart-design2-group');
 const focus=row.locator('[data-property="selectedRowColor"]');
 await focus.waitFor();
 assert.equal(await focus.getAttribute('data-supported'),'true','Row Focused wrongly disabled');
 const rowBold=row.locator('[data-property="rowBold"] button');
 await rowBold.waitFor();
 assert.equal(await rowBold.isDisabled(),false,'Row Bold should be enabled');
 await rowBold.click();
 assert.equal(await rowBold.getAttribute('aria-pressed'),'true',
  'Row Bold control did not write metadata value');

 // Renderer must apply the changed value to a real preview row.
 const rowStyle=page.locator('[data-component-id="browser-design2-cart"] .smart-cart-row').first();
 await rowStyle.waitFor({state:'visible'});
 assert.equal(await rowStyle.evaluate(element=>getComputedStyle(element).fontWeight),'700',
  'Cart row does not visually apply Row Bold');

 // Area switching must not change the selected component or old Design view.
 await area.selectOption('Table');
 assert.equal(await row.locator('[data-property="tableBackgroundColor"]').getAttribute('data-supported'),'true');
 await area.selectOption('Body');
 assert.equal(await row.locator('[data-property="wrapText"]').getAttribute('data-supported'),'false');
 await page.getByRole('tab',{name:'Design',exact:true}).click();
 await page.locator('.smart-ribbon-group[aria-label="Row"] [data-property="rowLabelColor"]').waitFor();
 assert.equal(await page.locator('.smart-ribbon-group[aria-label="Row"] [data-property="rowBold"]').count(),0,
  'Design 2 properties leaked into original Design tab');

 // Persist, reload and check that Design 2 is editing the same component SQL values.
 const saveResponses=[];
 const captureSave=response=>{
  if(response.url().includes('/api/metadata/pages/'+pageName))
   saveResponses.push({url:response.url(),method:response.request().method(),status:response.status()});
 };
 page.on('response',captureSave);
 const save=page.waitForResponse(response=>response.url().includes(
  '/api/metadata/pages/'+pageName+'/layouts/Desktop/draft')&&response.request().method()==='PUT',
  {timeout:10000}).catch(()=>null);
 await page.getByRole('button',{name:'Save',exact:true}).click();
 const savedResponse=await save;
 page.off('response',captureSave);
 assert.ok(savedResponse,'Design 2 Save did not reach SQL draft. Requests: '+
  JSON.stringify(saveResponses)+' UI: '+(await page.locator('body').innerText()).slice(-1000));
 assert.equal(savedResponse.status(),200,'Design 2 edit failed SQL draft save');
 const {PageRuntime}=await import('../dist-system/system-files/page-runtime.js');
 const runtime=new PageRuntime(db);
 const draft=await runtime.editor(tenantId,pageName,'Desktop');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.rowBold,true,
  'Row Bold did not survive SQL save');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.getByRole('tab',{name:'Design 2',exact:true}).click();
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await page.locator('.smart-design2-group [data-property="rowBold"] button')
  .getAttribute('aria-pressed'),'true','Design 2 saved value did not reload');

 // Smart Tabs uses the very same Focused icon slot with a different existing key.
 await page.locator('[data-component-id="browser-design2-tabs"]').first().click({position:{x:18,y:18}});
 await page.getByLabel('Select Design 2 area').selectOption('Tabs');
 assert.equal(await row.locator('[data-property="selectedTabColor"]').getAttribute('data-supported'),'true',
  'Tabs Focused does not bind the existing selected-tab colour');
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await row.locator('[data-property="selectedRowColor"]').getAttribute('data-supported'),'false',
  'Smart Tabs should not enable selected-row colour');
 const {mkdir}=await import('node:fs/promises');
 await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../artifacts/design2-contextual-ribbon.png',import.meta.url).pathname});
 console.info('Design 2 browser E2E: original Design preserved; Row Bold edited, rendered, saved, reloaded; Focused Row and Tabs correctly scoped');
}
