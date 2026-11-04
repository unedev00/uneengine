import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

/** Real PostgreSQL + compiled Page Builder browser contract.
 * Uses only disposable CI tenant data from builder-browser-smoke.mjs.
 */
export async function runDesign2BrowserCheck({page,origin,db,tenantId,token}){
 const approved=await readFile(new URL('../src/system-support/migrations/20271104-zz-design2-exact-approved-matrix.sql',import.meta.url),'utf8');
 // Production applies the legacy migration before this corrective migration.
 // Replay the CURRENT contract, not a superseded positional insert which can
 // collide with the exact R1..R3 unique-position constraint.
 await db.query(approved);
 await db.query(approved);
 const listed=await db.query(`SELECT area,slot_key,property_key,row_no,order_no,width_px,height_px
   FROM md_builder_design2_slots ORDER BY area_order,row_no,order_no`);
 // Shared areas are extensible: retain the legacy baseline and enforce unique SQL slots.
 assert.ok(listed.rows.length>=106,'Design 2 SQL slots missing after replay');
 assert.ok(new Set(listed.rows.map(row=>row.area)).size>=10,'Legacy Design 2 areas missing');
 assert.equal(new Set(listed.rows.map(row=>row.area+'/'+row.slot_key)).size,listed.rows.length,
  'Duplicate Design 2 slot keys after replay');
 assert.equal(new Set(listed.rows.map(row=>row.area+'/'+row.row_no+'/'+row.order_no)).size,listed.rows.length,
  'Duplicate Design 2 ribbon positions after replay');
 const slot=(area,key)=>listed.rows.find(row=>row.area===area&&row.slot_key===key);
 assert.equal(slot('Row','focused'),undefined,'Row Focus was not approved in the table');
 assert.equal(slot('Table','focused')?.row_no,2,'Table Focus must be R2');
 assert.equal(slot('Table','focused')?.order_no,1,'Table Focus must be C1');
 assert.equal(slot('Body','fill')?.row_no,1,'Body Color must be R1');
 assert.equal(slot('Body','fill')?.order_no,1,'Body Color must be C1');
 assert.equal(slot('Body','radius')?.row_no,1,'Body Radius must be R1');
 assert.equal(slot('Body','radius')?.order_no,5,'Body Radius must be C5');
 assert.equal(slot('Body','radius')?.width_px,80,'Body Radius must be 80px');
 assert.equal(slot('Focused','selection')?.property_key,'selectionMode');
 assert.equal(slot('Row Supporting','text')?.property_key,'rowSupportingTextColor');
 assert.equal(slot('Custom Button 1','shape')?.property_key,'customButton1Shape');
 assert.equal(slot('Custom Button 2','shape')?.property_key,'customButton2Shape');

 assert.equal(slot('Tabs','focused')?.property_key,'selectedTabColor');
 assert.equal(slot('Row','fill')?.property_key,'backgroundColor',
  'Approved Row Body Color must occupy its own fixed slot');
 assert.equal(slot('Body','wrap')?.property_key,'wrapText','Body Wrap must occupy R3C4');
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
 assert.equal(result.body.design2Slots?.length,listed.rows.length,'Builder endpoint did not expose Design 2 SQL metadata');
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
 // Ctrl+A is a canvas selection command, never browser text selection or a
 // metadata edit. Verify the real editor selects both existing page blocks.
 await page.keyboard.press('Control+a');
 assert.equal(await page.locator('.record-component.multi-selected').count(),2,
  'Ctrl+A should select both components on the active page');
 await cart.click({position:{x:18,y:18}});
 assert.equal(await page.locator('.record-component.multi-selected').count(),1,
  'A normal click should restore single-component selection after Ctrl+A');
 await page.getByRole('tab',{name:'Design 2',exact:true}).click();
 const design2=page.locator('.smart-design2-ribbon');
 await design2.waitFor({state:'visible'});
 const area=page.getByLabel('Select Design 2 area');
 assert.equal(await area.inputValue(),'Body');
 await area.selectOption('Row');
 // Row 0: fixed C1 selector, C2 eye, C3 X and C4 Y. Values edit the real
 // free-canvas component.position, not a duplicate properties.x/y field.
 const rowZero=design2.locator('.smart-design2-context[data-design-row="0"]');
 const xCell=rowZero.locator('[data-property="x"]');
 const yCell=rowZero.locator('[data-property="y"]');
 await xCell.waitFor({state:'visible'});
 await yCell.waitFor({state:'visible'});
 assert.equal(await xCell.getAttribute('data-design-column'),'3');
 assert.equal(await yCell.getAttribute('data-design-column'),'4');
 const xInput=xCell.getByRole('spinbutton',{name:'X Position'});
 const yInput=yCell.getByRole('spinbutton',{name:'Y Position'});
 assert.equal(await xInput.inputValue(),'24');
 assert.equal(await yInput.inputValue(),'28');
 for(const cell of [xCell,yCell]){
  const bounds=await cell.boundingBox();
  assert.ok(bounds&&Math.abs(bounds.width-80)<1&&Math.abs(bounds.height-26)<1,
   'R0 coordinate controls must be exactly 80x26px');
 }
 await xInput.fill('64');
 await yInput.fill('68');
 assert.equal(await cart.evaluate(element=>Number.parseFloat(element.style.left)),64,
  'R0 X did not reposition component on canvas');
 assert.equal(await cart.evaluate(element=>Number.parseFloat(element.style.top)),68,
  'R0 Y did not reposition component on canvas');
 const row=page.locator('.smart-design2-group');
 const rowFill=row.locator('[data-design-row="1"] [data-design-slot="fill"]');
 await rowFill.waitFor();
 assert.equal(await rowFill.getAttribute('data-design-column'),'1',
  'Row Body Color must remain R1C1 even when a renderer hook is unavailable');
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

 // R3C2 Alignment is a real ICON dropdown, not a text select.
 await area.selectOption('Header');
 const alignCell=row.locator('[data-design-row="3"] [data-design-slot="alignment"]');
 assert.equal(await alignCell.getAttribute('data-design-column'),'2');
 assert.equal(await alignCell.getAttribute('data-supported'),'true');
 const alignTrigger=alignCell.locator('.smart-icon-dropdown-trigger');
 await alignTrigger.click();
 await page.locator('.smart-icon-dropdown-popup [role="menuitemradio"]').nth(2).click();
 assert.match(await alignTrigger.getAttribute('aria-label')??'',/Right/);
 assert.equal(await cart.locator('.smart-cart-header').evaluate(element=>
   getComputedStyle(element).textAlign),'right','R3C2 alignment did not update the Cart header');

 // In the approved Image area R2C6 Placement and R3C6 Fill must both
 // have icon-based menus, including the existing Fit/Fill/Stretch choices.
 await area.selectOption('Image');
 const imagePlacement=row.locator('[data-design-row="2"] [data-design-slot="placement"]');
 const imageFill=row.locator('[data-design-row="3"] [data-design-slot="imageFill"]');
 assert.equal(await imagePlacement.getAttribute('data-design-column'),'6');
 assert.equal(await imageFill.getAttribute('data-design-column'),'6');
 assert.equal(await imagePlacement.getAttribute('data-supported'),'true');
 assert.equal(await imageFill.getAttribute('data-supported'),'true');
 assert.equal(await imagePlacement.locator('.design2-icon-trigger').count(),1,
   'R2C6 image placement must be an icon dropdown');
 assert.equal(await imageFill.locator('.design2-icon-trigger').count(),1,
   'R3C6 image fit must be an icon dropdown');
 // Geometry is Excel-owned and remains at 40x26px, not enlarged by
 // the earlier Design tab's wider select CSS.
 const placementRect=await imagePlacement.locator('.design2-icon-trigger').boundingBox();
 const fillRect=await imageFill.locator('.design2-icon-trigger').boundingBox();
 for(const bounds of [placementRect,fillRect]){
  assert.ok(bounds&&Math.abs(bounds.width-40)<1&&Math.abs(bounds.height-26)<1,
    'Image icon dropdown must occupy exactly 40x26 px at its R/C position');
 }
 assert.ok(Math.abs(placementRect.x-fillRect.x)<1,
   'Image Placement R2C6 and Image Fill R3C6 must share column C6');

 const placementTrigger=imagePlacement.locator('.design2-icon-trigger');
 const fillTrigger=imageFill.locator('.design2-icon-trigger');
 assert.equal(await placementTrigger.getAttribute('data-icon-kind'),'imagePlacement');
 assert.equal(await fillTrigger.getAttribute('data-icon-kind'),'imageFill');
 await placementTrigger.click();
 // Cart's pre-existing contract allows ONLY Left and Right, whereas Card
 // Grid and Smart Image offer all four. Do not offer unsupported Top/Bottom.
 assert.deepEqual(await page.locator('.design2-icon-popup [role="menuitemradio"]:not([disabled])')
   .evaluateAll(buttons=>buttons.map(button=>button.title)),['Left','Right']);
 await page.locator('.design2-icon-popup button[title="Left"]').click();
 await fillTrigger.click();
 assert.deepEqual(await page.locator('.design2-icon-popup [role="menuitemradio"]:not([disabled])')
   .evaluateAll(buttons=>buttons.map(button=>button.title)),['Fill','Fit','Stretch']);
 await page.locator('.design2-icon-popup button[title="Fit"]').click();
 assert.match(await fillTrigger.getAttribute('aria-label')??'',/Fit/);

 // Area switching must not change the selected component or old Design view.
 await area.selectOption('Table');
 assert.equal(await row.locator('[data-property="tableBackgroundColor"]').getAttribute('data-supported'),'true');
 assert.equal(await row.locator('[data-design-row="2"] [data-design-slot="focused"]')
   .getAttribute('data-design-column'),'1','Table Focus must remain at R2C1');
 await area.selectOption('Body');
 assert.equal(await row.locator('[data-design-row="3"] [data-design-slot="wrap"]')
   .getAttribute('data-supported'),'false','Cart Body Wrap was not approved');
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
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.headerAlignment,'right',
  'Design 2 R3C2 alignment icon dropdown did not persist');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.imagePlacement,'left',
  'Design 2 R2C6 image placement icon dropdown did not persist');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.imageFill,'fit',
  'Design 2 R3C6 image fit icon dropdown did not persist');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.position?.x,64,
  'Design 2 R0 X position did not survive SQL save');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.position?.y,68,
  'Design 2 R0 Y position did not survive SQL save');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.x,undefined,
  'Design 2 must not duplicate canvas X in properties.x');
 assert.equal(draft.components.find(item=>item.id==='browser-design2-cart')?.properties.y,undefined,
  'Design 2 must not duplicate canvas Y in properties.y');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.getByRole('tab',{name:'Design 2',exact:true}).click();
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await page.locator('.smart-design2-group [data-property="rowBold"] button')
  .getAttribute('aria-pressed'),'true','Design 2 saved value did not reload');

 // Approved Yes/No sections are component-specific. The legacy "Tabs"
 // section is not in the user's Smart Tabs Design 2 matrix.
 await page.locator('[data-component-id="browser-design2-tabs"]').first().click({position:{x:18,y:18}});
 const tabsAreas=await page.getByLabel('Select Design 2 area').locator('option').allTextContents();
 assert.deepEqual(tabsAreas,['Body'],'Smart Tabs should show only its approved Body area');
 const tabsFocus=row.locator('[data-design-row="2"] [data-design-slot="focused"]');
 assert.equal(await tabsFocus.getAttribute('data-supported'),'false',
   'Do not enable an unapproved Focus Color for Smart Tabs');
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await row.locator('[data-design-row="2"] [data-design-slot="focused"]').count(),0,
   'Row Focus was not approved for Smart Cart and must not be invented');
 const {mkdir}=await import('node:fs/promises');
 await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../artifacts/design2-contextual-ribbon.png',import.meta.url).pathname});

 // Ctrl+A, Delete and Undo must agree on the exact multi-selection. A single
 // confirmation removes the full active layout selection, never just selectedId.
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.keyboard.press('Control+a');
 assert.equal(await page.locator('.record-component.multi-selected').count(),2,
  'Both Page Builder components must be selected before bulk Delete');
 const dialogs=[];
 page.once('dialog',dialog=>{dialogs.push(dialog.message());void dialog.accept();});
 await page.keyboard.press('Delete');
 await page.waitForFunction(()=>document.querySelectorAll('[data-component-id="browser-design2-cart"],[data-component-id="browser-design2-tabs"]').length===0);
 assert.equal(dialogs.length,1,'Bulk Delete must require one confirmation');
 assert.match(dialogs[0],/2 selected page components/);
 await page.keyboard.press('Control+z');
 await page.locator('[data-component-id="browser-design2-cart"]').first().waitFor({state:'visible'});
 await page.locator('[data-component-id="browser-design2-tabs"]').first().waitFor({state:'visible'});
 assert.equal(await page.locator('[data-component-id="browser-design2-cart"],[data-component-id="browser-design2-tabs"]').count(),2,
  'A single Undo must restore all deleted components');

 console.info('Design 2 browser E2E: original Design preserved; Row Bold persisted; Ctrl+A/Delete removes all selected, one Undo restores all');
}
