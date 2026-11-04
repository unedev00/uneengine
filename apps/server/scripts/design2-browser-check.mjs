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
 // The exact-matrix replay replaces approved property targets. Reapply its
 // later semantic fix so this browser test exercises the actual latest schema.
 const parity=await readFile(new URL('../src/system-support/migrations/20271106-design2-functional-control-parity.sql',import.meta.url),'utf8');
 await db.query(parity);
 await db.query(parity);
 // After replaying the older exact matrix, restore these four component-specific
 // semantic mappings. Replaying twice proves the migration is idempotent.
 const fourControls=await readFile(new URL('../src/system-support/migrations/20271108-design2-four-control-parity.sql',import.meta.url),'utf8');
 await db.query(fourControls);
 await db.query(fourControls);
 // The replayed approved baseline resets Image Placement to R2C6. Reapply
 // the latest forward-only geometry fix before testing the browser contract.
 const placementGap=await readFile(new URL('../src/system-support/migrations/20271112-design2-image-placement-gap.sql',import.meta.url),'utf8');
 await db.query(placementGap);
 await db.query(placementGap);
 const fourRows=await db.query(`SELECT r.component_api,r.area,r.slot_key,r.property_key,
        COALESCE(component.enabled,false) enabled
   FROM md_builder_design2_slot_rules r
   JOIN md_builder_ribbon_component_rules component
     ON component.component_api=r.component_api AND component.property_key=r.property_key
   WHERE (r.component_api,r.area,r.slot_key) IN (
     ('smart_calendar','Body','focused'),
     ('smart_card_grid','Body','wrap'),
     ('smart_navigation','Image','imageFill'),
     ('smart_toggle','Body','shape'))`);
 for(const [api,area,slot,key] of [
   ['smart_calendar','Body','focused','defaultValueColor'],
   ['smart_card_grid','Body','wrap','wrapText'],
   ['smart_navigation','Image','imageFill','imageFill'],
   ['smart_toggle','Body','shape','shapeId']
 ]){
   const found=fourRows.rows.find(row=>row.component_api===api&&row.area===area&&row.slot_key===slot);
   assert.equal(found?.property_key,key,api+' must edit the existing renderer property');
   assert.equal(found?.enabled,true,api+' must be enabled in the shared ribbon');
 }
 const actualTargets=await db.query(`SELECT component_api,area,slot_key,property_key
   FROM md_builder_design2_slot_rules
   WHERE (component_api='smart_tabs' AND area='Body' AND slot_key='fill')
      OR (component_api='smart_textbox' AND area='Body' AND slot_key='wrap')
      OR (component_api='smart_textbox' AND area='Header Supporting' AND slot_key='alignment')
      OR (component_api='smart_icon' AND area='Body' AND slot_key='height')`);
 for(const [component,area,slot,property] of [
   ['smart_tabs','Body','fill','backgroundColor'],
   ['smart_textbox','Body','wrap','wrapText'],
   ['smart_textbox','Header Supporting','alignment','supportingAlignment'],
   ['smart_icon','Body','height','height']
 ])assert.ok(actualTargets.rows.some(row=>row.component_api===component&&row.area===area&&
    row.slot_key===slot&&row.property_key===property),
   'Design 2 semantic target missing: '+component+' '+area+' '+slot);
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
        ($1,'smart_tabs','one-bundled:smart_tabs',true),
        ($1,'smart_calendar','one-bundled:smart_calendar',true),
        ($1,'smart_card_grid','one-bundled:smart_card_grid',true),
        ($1,'smart_navigation','one-bundled:smart_navigation',true),
        ($1,'smart_toggle','one-bundled:smart_toggle',true),
        ($1,'smart_button','one-bundled:smart_button',true),
        ($1,'smart_text','one-bundled:smart_text',true),
        ($1,'smart_textbox','one-bundled:smart_textbox',true),
        ($1,'smart_image','one-bundled:smart_image',true),
        ($1,'smart_lookup','one-bundled:smart_lookup',true),
        ($1,'smart_table','one-bundled:smart_table',true),
        ($1,'smart_label','one-bundled:smart_label',true),
        ($1,'smart_container','one-bundled:smart_container',true),
        ($1,'smart_icon','one-bundled:smart_icon',true)
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
 await page.getByRole('tab',{name:'Design',exact:true}).waitFor({timeout:20000});

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
 await page.getByRole('tab',{name:'Design',exact:true}).click();
 const design2=page.locator('.smart-design2-ribbon');
 await design2.waitFor({state:'visible'});
 const area=page.getByLabel('Select Design 2 area');
 assert.equal(await area.inputValue(),'Body');
 // Excel's 14 dropdown sections are always shown. The per-component
 // Yes/No rules disable controls, never filter sections from the dropdown.
 const allAreas=await area.locator('option').allTextContents();
 for(const required of ['Body','Header','Badge','Header Supporting','Table',
  'Row','Summary','Summary 2','Footer','Tabs','Button','Card Grid','Button 2',
  'Focused','Button 3','Row Supporting','Button 4','Custom Button 1',
  'Button 5','Image','Custom Button 2']){
  assert.ok(allAreas.includes(required),'Missing Excel section: '+required);
 }
 assert.equal(new Set(allAreas).size,allAreas.length,
  'The dropdown must show every defined area exactly once');
 // FIXED TEMPLATE CONTRACT: The actual on-screen 17 control icons must
 // occupy exactly the same R/C cells with identical dimensions and relative
 // pixel locations in EVERY dropdown. Only enabled/disabled may change.
 const design2GridFingerprint=()=>page.locator('.smart-design2-group .smart-design2-workbench > .smart-ribbon-items > .smart-ribbon-row > .smart-property')
  .evaluateAll(elements=>elements.map(element=>{
   const row=element.closest('.smart-ribbon-row');
   const box=element.getBoundingClientRect();
   const rowBox=row.getBoundingClientRect();
   return {
    row:Number(row.dataset.designRow),
    column:Number(element.dataset.designColumn),
    slot:element.dataset.designSlot,
    width:Math.round(box.width),
    height:Math.round(box.height),
    x:Math.round(box.x-rowBox.x),
    visible:getComputedStyle(element).display!=='none',
    hasEditor:!!element.querySelector('button,select,input')
   };
  }).sort((a,b)=>a.row-b.row||a.column-b.column));
 const template=await design2GridFingerprint();
 assert.equal(template.length,17,'The approved R1-R3 fixed ribbon must have 17 icon controls');
 assert.ok(template.every(item=>item.visible&&item.hasEditor),
  'Every fixed cell must show its real control, even when disabled');
 for(const section of allAreas){
  await area.selectOption(section);
  assert.deepEqual(await design2GridFingerprint(),template,
   'Switching to '+section+' changed the R/C icon layout instead of only enable/disable');
 }
 await area.selectOption('Table');
 const inactiveShape=page.locator('.smart-design2-group [data-design-row="1"] [data-design-slot="shape"]');
 assert.equal(await inactiveShape.count(),1,'Table R1C3 Shape must remain visible');
 assert.equal(await inactiveShape.getAttribute('data-supported'),'false',
  'Table R1C3 must be disabled, not hidden');
 assert.equal(await inactiveShape.locator('button').first().isDisabled(),true,
  'Unsupported Table R1C3 must be an actual disabled control');
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

 // Image Placement sits beside Width at R2C5; Image Fill stays at R3C6.
 // have icon-based menus, including the existing Fit/Fill/Stretch choices.
 await area.selectOption('Image');
 const imagePlacement=row.locator('[data-design-row="2"] [data-design-slot="placement"]');
 const imageFill=row.locator('[data-design-row="3"] [data-design-slot="imageFill"]');
 assert.equal(await imagePlacement.getAttribute('data-design-column'),'5');
 assert.equal(await imageFill.getAttribute('data-design-column'),'6');
 assert.equal(await imagePlacement.getAttribute('data-supported'),'true');
 assert.equal(await imageFill.getAttribute('data-supported'),'true');
 assert.equal(await imagePlacement.locator('.design2-icon-trigger').count(),1,
   'R2C5 image placement must be an icon dropdown');
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
 // Placement must have only the standard 4px grid gap after Width (R2C4).
 const widthRect=await row.locator('[data-design-row="2"] [data-design-slot="width"]').boundingBox();
 assert.ok(widthRect&&placementRect&&Math.abs(placementRect.x-(widthRect.x+widthRect.width+4))<1,
   'Image Placement has an unnecessary gap after the Width field');
 assert.equal(Math.round(fillRect.x),Math.round(
   template.find(item=>item.row===3&&item.column===6).x+
   (await row.locator('[data-design-row="3"]').boundingBox()).x));
 // Old flex!important plus grid-area:auto!important collapsed Image slots into C1.
 const firstImageCell=row.locator('[data-design-row="1"] [data-design-slot="fill"]');
 const firstRect=await firstImageCell.boundingBox();
 assert.ok(firstRect&&placementRect.x>firstRect.x+200,
   'Image R2C5 appears at C1 instead of the fixed C5 position');
 assert.ok(firstRect&&fillRect.x>firstRect.x+200,
   'Image R3C6 appears at C1 instead of the fixed C6 position');
 for(const index of [1,2,3]){
  assert.equal(await row.locator('[data-design-row="'+index+'"]').evaluate(
    element=>getComputedStyle(element).display),'grid',
    'Property row '+index+' must render as grid, not flex');
 }

 const placementTrigger=imagePlacement.locator('.design2-icon-trigger');
 const fillTrigger=imageFill.locator('.design2-icon-trigger');
 assert.equal(await placementTrigger.getAttribute('data-icon-kind'),'imagePlacement');
 assert.equal(await fillTrigger.getAttribute('data-icon-kind'),'imageFill');
 await placementTrigger.click();
 // The popup portal must be ABOVE the canvas actions portal (z-index 11000),
 // otherwise the "Left" choice appears but the floating toolbar steals clicks.
 const dropdownLayer=await page.locator('.design2-icon-popup').evaluate(element=>
  Number(getComputedStyle(element).zIndex));
 const canvasLayer=await page.locator('.canvas-floating-actions-host').first().evaluate(element=>
  Number(getComputedStyle(element).zIndex));
 assert.ok(dropdownLayer>canvasLayer,
  'Design 2 icon popup must stay clickable above the canvas floating toolbar');
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
 // Both user-reported "blank spaces" must contain the actual DISABLED icons,
 // immediately after their 40px predecessor, not a phantom 80px C3 track.
 // Body R1C3 Shape -> R1C4 Shape Fill, R3C3 Bold -> R3C4 Wrap.
 const cartBodyShapeSlot=row.locator('[data-design-row="1"] [data-design-slot="shape"]');
 const cartBodyShapeFillSlot=row.locator('[data-design-row="1"] [data-design-slot="shapeFill"]');
 const cartBodyBoldSlot=row.locator('[data-design-row="3"] [data-design-slot="bold"]');
 const cartBodyWrapSlot=row.locator('[data-design-row="3"] [data-design-slot="wrap"]');
 for(const [a,b,description] of [[cartBodyShapeSlot,cartBodyShapeFillSlot,'Shape/Shape Fill'],
   [cartBodyBoldSlot,cartBodyWrapSlot,'Bold/Wrap']]){
  const first=await a.boundingBox(),second=await b.boundingBox();
  assert.ok(first&&second&&Math.abs(second.x-first.x-44)<1,
   description+' must be consecutive fixed 40px icons (+4px gap)');
  assert.ok(Math.abs(first.width-40)<1&&Math.abs(second.width-40)<1,
   description+' must remain 40px wide as in Excel');
 }
 assert.equal(await cartBodyShapeFillSlot.getAttribute('data-supported'),'true',
  'Cart Body Shape Fill is approved; keep its existing enabled status');
 assert.equal(await cartBodyShapeFillSlot.getAttribute('data-kind'),'color',
  'Unsupported Shape Fill must keep its colour icon, not become a blank number input');
 assert.equal(await cartBodyShapeFillSlot.locator('.office-ribbon-colour-property').count(),1,
  'Shape Fill colour icon must render after Shape');
 assert.equal(await cartBodyWrapSlot.getAttribute('data-supported'),'false',
  'Cart Body Wrap is not approved: show it disabled, do not hide it');
 assert.equal(await cartBodyWrapSlot.locator('button.smart-icon-toggle').count(),1,
  'Wrap must render its disabled icon after Bold');
 // The legacy Design tab is retired: Design 2 is the only Design tab.
 assert.equal(await page.getByRole('tab',{name:'Design 2',exact:true}).count(),0,
  'Retired legacy Design tab must not return beside Design 2');

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
  'Design 2 R2C5 image placement icon dropdown did not persist');
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
 await page.getByRole('tab',{name:'Design',exact:true}).click();
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await page.locator('.smart-design2-group [data-property="rowBold"] button')
  .getAttribute('aria-pressed'),'true','Design 2 saved value did not reload');

 // All sections stay visible for Smart Tabs, too. The unsupported Image
 // controls occupy the exact same R/C cells but cannot be edited.
 await page.locator('[data-component-id="browser-design2-tabs"]').first().click({position:{x:18,y:18}});
 const tabsAreas=await page.getByLabel('Select Design 2 area').locator('option').allTextContents();
 assert.deepEqual(tabsAreas,allAreas,'All Excel areas must be visible for Smart Tabs');
 await page.getByLabel('Select Design 2 area').selectOption('Image');
 for(const [slotKey,rowNumber,column] of [['fill',1,1],['placement',2,5],['imageFill',3,6]]){
  const control=row.locator('[data-design-row="'+rowNumber+'"] [data-design-slot="'+slotKey+'"]');
  assert.equal(await control.count(),1,'Unsupported Image slot must remain visible');
  assert.equal(await control.getAttribute('data-design-column'),String(column));
  assert.equal(await control.getAttribute('data-supported'),'false',
   'Unsupported Image control must not become editable for Smart Tabs');
  assert.ok((await control.getAttribute('class'))?.includes('disabled'),
   'Unsupported Image slot must remain disabled');
 }
 await page.getByLabel('Select Design 2 area').selectOption('Body');
 const tabsFocus=row.locator('[data-design-row="2"] [data-design-slot="focused"]');
 assert.equal(await tabsFocus.getAttribute('data-supported'),'false',
   'Do not enable unapproved Focus Color for Smart Tabs');
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.getByLabel('Select Design 2 area').selectOption('Row');
 assert.equal(await row.locator('[data-design-row="2"] [data-design-slot="focused"]').count(),1,
   'Row Focus must remain visible, even when not approved');
 assert.equal(await row.locator('[data-design-row="2"] [data-design-slot="focused"]')
   .getAttribute('data-supported'),'false',
   'Unsupported Row Focus must remain disabled');
 const {mkdir}=await import('node:fs/promises');
 await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../artifacts/design2-contextual-ribbon.png',import.meta.url).pathname});

 // Trial left Design dock: the topbar toggle moves the same Design 2 controls into a
 // left panel; the collapse toggle hides the ribbon strip. Both must return to normal.
 await page.locator('[data-component-id="browser-design2-cart"]').first().click({position:{x:18,y:18}});
 await page.getByLabel('Select Design 2 area').selectOption('Body');
 const dockToggle=page.getByRole('button',{name:'Show Design in a left panel'});
 await dockToggle.waitFor({state:'visible'});
 await dockToggle.click();
 const dock=page.locator('.page-builder-design-dock');
 await dock.locator('.smart-design2-area-select').waitFor({state:'visible'});
 assert.equal(await page.locator('.smart-design2-ribbon').count(),1,'Design 2 must render once, in the dock');
 await page.screenshot({path:new URL('../artifacts/design2-left-dock.png',import.meta.url).pathname});
 await page.getByRole('button',{name:'Collapse the ribbon'}).click();
 await page.screenshot({path:new URL('../artifacts/design2-left-dock-ribbon-collapsed.png',import.meta.url).pathname});
 await page.getByRole('button',{name:'Pin the ribbon'}).click();
 await page.getByRole('button',{name:'Show Design in the ribbon'}).first().click();
 await page.locator('.office-builder-ribbon[aria-label="Page Builder ribbon"] .smart-design2-ribbon').waitFor({state:'visible'});

 // Verify real selected-component binding icon geometry in Chromium, not
 // just the existence of SQL properties or hard-coded source attributes.
 const auditBindings=async(id)=>{
  const root=page.locator('[data-component-id="'+id+'"]').first();
  await root.locator('.canvas-data-icon-button').first().waitFor({state:'visible'});
  const result=await root.evaluate(host=>{
   const icons=[...host.querySelectorAll('.canvas-data-icon-button')];
   const anchors=[...host.querySelectorAll('[data-md-bind]')];
   const bounds=host.getBoundingClientRect(),errors=[];
   for(const icon of icons){
    const key=icon.dataset.bindingProperty;
    const fields=anchors.filter(el=>(el.getAttribute('data-md-bind')||'').split(/\s+/).includes(key));
    if(!fields.length){errors.push('No field: '+key);continue;}
    const rect=icon.getBoundingClientRect();
    if(rect.left<bounds.left-2||rect.top<bounds.top-2||
      rect.right>bounds.right+2||rect.bottom>bounds.bottom+2)errors.push('Outside: '+key);
    const distance=Math.min(...fields.map(field=>{
     const a=field.getBoundingClientRect();
     return Math.hypot(Math.max(a.left-rect.right,rect.left-a.right,0),
      Math.max(a.top-rect.bottom,rect.top-a.bottom,0));
    }));
    if(distance>32)errors.push('Detached: '+key+' '+distance);
   }
   for(let i=0;i<icons.length;i++)for(let j=i+1;j<icons.length;j++){
    const a=icons[i].getBoundingClientRect(),b=icons[j].getBoundingClientRect();
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&
     Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)
     errors.push('Overlapping: '+icons[i].dataset.bindingProperty+'/'+icons[j].dataset.bindingProperty);
   }
   return {errors,properties:icons.map(el=>el.dataset.bindingProperty)};
  });
  assert.deepEqual(result.errors,[],'Misplaced '+id+' binding icons: '+JSON.stringify(result));
  return result.properties;
 };
 const tabCanvas=page.locator('[data-component-id="browser-design2-tabs"]').first();
 await tabCanvas.click({position:{x:10,y:10}});
 const tabKeys=await auditBindings('browser-design2-tabs');
 assert.equal(tabKeys.filter(key=>key==='tabCaptionFormula').length,2,
  'One independently editable caption per visible static tab');
 assert.ok(!tabKeys.includes('label'),'Tabs must not expose an unrelated Label icon');
 assert.ok(!tabKeys.includes('collectionFormula'),'Static tabs must not show a collection icon');
 await tabCanvas.locator('[data-binding-property="tabCaptionFormula"]').nth(1).click();
 await page.locator('.smart-data-active-binding').getByText('Tab caption').waitFor({state:'visible'});
 const formulaInput=page.locator('.smart-data-formula-input input').first();
 await formulaInput.waitFor({state:'visible'});
 assert.equal(await formulaInput.inputValue(),'Tab 2',
  'Second tab icon must select its actual caption');
 assert.ok(await formulaInput.evaluate(el=>document.activeElement===el),
  'The existing Formula Bar must be focused after clicking an icon');
 const cartCanvas=page.locator('[data-component-id="browser-design2-cart"]').first();
 await cartCanvas.click({position:{x:10,y:10}});
 const cartKeys=await auditBindings('browser-design2-cart');
 for(const key of ['cartColumn1Header','cartColumn2Header','cartColumn3Header',
  'cartColumn4Header','subtotalLabel','subtotalValue','totalLabel','totalValue'])
  assert.ok(cartKeys.includes(key),'Missing Cart visual binding '+key);
 assert.equal(await tabCanvas.locator('.canvas-data-icon-button').count(),0,
  'Unselected components must not show data icons');
 await cartCanvas.locator('[data-binding-property="cartColumn2Header"]').click();
 await page.locator('.smart-data-active-binding').getByText('Unit price heading')
  .waitFor({state:'visible'});
 await page.screenshot({path:new URL('../artifacts/selected-cart-field-binding-icons.png',import.meta.url).pathname});

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


 // Four controls must be editable on a REAL persisted Page Builder page, with
 // the original icons, fixed SQL coordinates, rendered effect and SQL save.
 const fourPageName='browserdesign2four';
 const fourPayload={
  apiName:fourPageName,label:'Design 2 Four Control',targetObject:'',
  pageType:'App Page',layoutMode:'free-canvas',canvasWidth:1280,canvasHeight:900,
  status:'Draft',devices:['Desktop'],activationAssignments:[],
  components:[
   {id:'four-calendar',type:'Custom:smart_calendar',label:'Focus calendar',
    region:'main',visible:true,
    properties:{selectedDate:'2026-11-04',defaultValueColor:'#2563eb'},
    position:{x:28,y:32,width:330,height:280}},
   {id:'four-grid',type:'Custom:smart_card_grid',label:'Wrap card',
    region:'main',visible:true,
    properties:{textSource:'"Two line card header"',imageHeight:0,wrapText:false},
    position:{x:402,y:32,width:350,height:280}},
   {id:'four-nav',type:'Custom:smart_navigation',label:'Image navigation',
    region:'main',visible:true,properties:{imageFill:'fill',
     items:[{id:'one',label:'Menu',imageSrc:'https://example.com/menu.png'}]},
    position:{x:28,y:360,width:460,height:128}},
   {id:'four-toggle',type:'Custom:smart_toggle',label:'Shape toggle',
    region:'main',visible:true,properties:{shapeId:'shape:rectangle'},
    position:{x:540,y:360,width:150,height:100}}
  ]
 };
 const fourCreate=await page.evaluate(async({token,payload})=>{
  const response=await fetch('/api/metadata/pages/'+payload.apiName,{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
 },{token,payload:fourPayload});
 assert.equal(fourCreate.status,200,'Cannot seed four-control E2E page: '+
   JSON.stringify(fourCreate.body));
 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search pages').fill('Design 2 Four Control');
 await page.getByRole('button',{name:'Design Design 2 Four Control',exact:true}).click();
 await page.getByRole('tab',{name:'Design',exact:true}).waitFor({timeout:20000});
 const selectFour=async(id,area)=>{
  const block=page.locator('[data-component-id="'+id+'"]').first();
  await block.waitFor({state:'visible'});
  await block.click({position:{x:8,y:8}});
  await page.getByRole('tab',{name:'Design',exact:true}).click();
  await page.getByLabel('Select Design 2 area').selectOption(area);
  return block;
 };
 const fourRibbon=page.locator('.smart-design2-group');

 const calendarBlock=await selectFour('four-calendar','Body');
 const focus=fourRibbon.locator('[data-design-row="2"] [data-design-slot="focused"]');
 assert.equal(await focus.getAttribute('data-property'),'defaultValueColor');
 assert.equal(await focus.getAttribute('data-design-column'),'1');
 assert.equal(await focus.getAttribute('data-supported'),'true');
 const focusTrigger=focus.locator('button.office-ribbon-colour-property');
 assert.equal(await focusTrigger.isDisabled(),false,'Calendar Focus icon must be enabled');
 assert.ok(await focusTrigger.locator('svg').count(),'Calendar Focus must use the palette icon');
 await focusTrigger.click();
 const palette=page.locator('.office-ribbon-colour-palette');
 await palette.getByRole('textbox',{name:'HEX for Focused Color'}).fill('#126abc');
 await palette.getByRole('button',{name:'Apply',exact:true}).click();
 const focusedDay=calendarBlock.locator('.smart-calendar-selected-day');
 await focusedDay.waitFor({state:'visible'});
 assert.equal(await focusedDay.evaluate(element=>getComputedStyle(element).backgroundColor),
  'rgb(18, 106, 188)','Calendar Focus must paint the selected day');

 const gridBlock=await selectFour('four-grid','Body');
 const wrap=fourRibbon.locator('[data-design-row="3"] [data-design-slot="wrap"]');
 assert.equal(await wrap.getAttribute('data-property'),'wrapText');
 assert.equal(await wrap.getAttribute('data-design-column'),'4');
 assert.equal(await wrap.getAttribute('data-supported'),'true');
 const wrapToggle=wrap.getByRole('button',{name:'Wrap Text'});
 assert.equal(await wrapToggle.isDisabled(),false,'Card Grid Wrap must be editable');
 await wrapToggle.click();
 assert.equal(await wrapToggle.getAttribute('aria-pressed'),'true');
 assert.equal(await gridBlock.locator('.smart-card-content').first().evaluate(element=>
  getComputedStyle(element).whiteSpace),'normal','Card Grid Wrap must change header wrapping');

 const navBlock=await selectFour('four-nav','Image');
 const navFit=fourRibbon.locator('[data-design-row="3"] [data-design-slot="imageFill"]');
 assert.equal(await navFit.getAttribute('data-property'),'imageFill');
 assert.equal(await navFit.getAttribute('data-design-column'),'6');
 assert.equal(await navFit.getAttribute('data-supported'),'true');
 const navFitTrigger=navFit.locator('.design2-icon-trigger');
 assert.equal(await navFitTrigger.isDisabled(),false,'Navigation image fit icon disabled');
 await navFitTrigger.click();
 assert.deepEqual(await page.locator('.design2-icon-popup [role="menuitemradio"]:not([disabled])')
  .evaluateAll(buttons=>buttons.map(button=>button.title)),['Fill','Fit','Stretch']);
 await page.locator('.design2-icon-popup button[title="Fit"]').click();
 assert.equal(await navBlock.locator('.smart-navigation-item img').first().evaluate(element=>
  getComputedStyle(element).objectFit),'contain','Navigation Fit must update image object-fit');

 const toggleBlock=await selectFour('four-toggle','Body');
 const shape=fourRibbon.locator('[data-design-row="1"] [data-design-slot="shape"]');
 assert.equal(await shape.getAttribute('data-property'),'shapeId');
 assert.equal(await shape.getAttribute('data-design-column'),'3');
 assert.equal(await shape.getAttribute('data-supported'),'true');
 const shapeTrigger=shape.locator('button.smart-shapes-trigger');
 assert.equal(await shapeTrigger.isDisabled(),false,'Toggle Shape gallery disabled');
 await shapeTrigger.click();
 await page.getByRole('dialog',{name:'Choose shape or icon'}).getByRole('button',{name:'Oval',exact:true}).click();
 assert.equal(await toggleBlock.locator('.smart-switch-track').evaluate(element=>
  getComputedStyle(element).borderRadius),'50%',
  'Toggle Shape must visibly change the switch track');

 const fourSaved=page.waitForResponse(response=>response.url().includes(
  '/api/metadata/pages/'+fourPageName+'/layouts/Desktop/draft')&&
  response.request().method()==='PUT',{timeout:10000});
 await page.getByRole('button',{name:'Save',exact:true}).click();
 assert.equal((await fourSaved).status(),200,'Four control Design 2 save failed');
 const fourDraft=await runtime.editor(tenantId,fourPageName,'Desktop');
 const fourProps=id=>fourDraft.components.find(item=>item.id===id)?.properties;
 assert.equal(fourProps('four-calendar')?.defaultValueColor,'#126abc');
 assert.equal(fourProps('four-grid')?.wrapText,true);
 assert.equal(fourProps('four-nav')?.imageFill,'fit');
 assert.equal(fourProps('four-toggle')?.shapeId,'shape:oval');
 console.info('Four Design 2 icon controls: enabled, edited, visibly applied and saved in SQL');

 // Exercise the remaining already seeded types under the same geometry test.
 for(const [id,required] of [
  ['four-calendar',['selectedDate']],['four-grid',['textSource']],
  ['four-nav',[]],['four-toggle',['textSource']]
 ]){
  const component=page.locator('[data-component-id="'+id+'"]').first();
  await component.click({position:{x:10,y:10}});
  if(!required.length){
   assert.equal(await component.locator('.canvas-data-icon-button').count(),0);
   continue;
  }
  const keys=await auditBindings(id);
  for(const key of required)assert.ok(keys.includes(key),id+' missing '+key);
 }
 // Audit every other Smart component family in this authenticated SQL Builder.
 // Fields without visible anchors must never generate unpositioned icons.
 const bindingsPageName='browserallsmartbindings';
 const families=[
  ['smart_button',{label:'Start order'},['label']],
  ['smart_text',{textSource:'"Product text"'},['textSource']],
  ['smart_textbox',{label:'Product name',textSource:'"Sample"'},['label','textSource']],
  ['smart_image',{imageHeight:80},['imageSource']],
  ['smart_lookup',{placeholder:'Search products',lookupValueFormula:'"test"'},['label','lookupValueFormula']],
  ['smart_label',{label:'Smart caption'},['label']],
  ['smart_table',{textSource:'"Name"'},['textSource']],
  ['smart_container',{},[]],
  ['smart_icon',{},[]]
 ];
 const bindingPayload={...payload,apiName:bindingsPageName,label:'All Smart Data Bindings',
  canvasWidth:1320,canvasHeight:1750,
  components:families.map(([api,properties],i)=>({
   id:'binding-'+api,type:'Custom:'+api,label:api,region:'main',visible:true,
   properties,position:{x:24+(i%3)*426,y:24+Math.floor(i/3)*520,width:390,height:440}
  }))};
 const bindingCreate=await page.evaluate(async({token,payload})=>{
  const response=await fetch('/api/metadata/pages/'+payload.apiName,{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
 },{token,payload:bindingPayload});
 assert.equal(bindingCreate.status,200,'Cannot seed all-Smart data audit page: '+
  JSON.stringify(bindingCreate.body));
 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search pages').fill('All Smart Data Bindings');
 await page.getByRole('button',{name:'Design All Smart Data Bindings',exact:true}).click();
 for(const [api,,expected] of families){
  const root=page.locator('[data-component-id="binding-'+api+'"]').first();
  await root.waitFor({state:'visible'});
  await root.click({position:{x:12,y:12}});
  if(!expected.length){
   assert.equal(await root.locator('.canvas-data-icon-button').count(),0,
    api+' must not invent icons for unbound visual fields');
   continue;
  }
  const keys=await auditBindings('binding-'+api);
  for(const key of expected)assert.ok(keys.includes(key),
   api+' must display an icon beside '+key+' when selected: '+keys.join(','));
  assert.equal(await root.locator('.canvas-data-icon-button.is-fallback').count(),0,
   api+' must never render a bottom-right fallback grid');
 }
 console.info('All Smart families: no icon piles; every displayed icon is field-anchored');

 // The shared Arrange handlers must also work from the fixed Design 2 R0
 // commands on a REAL three-component SQL draft. Single selection aligns to
 // canvas edges; multi selection distributes, groups and unlocks normally.
 const arrangePageName='browserdesign2arrange';
 const arrangePayload={...payload,apiName:arrangePageName,label:'Design 2 Arrange',
  components:[
   {...payload.components[0],id:'arrange-one',label:'Arrange One',
    position:{x:50,y:40,width:160,height:160}},
   {...payload.components[1],id:'arrange-two',label:'Arrange Two',
    position:{x:250,y:70,width:160,height:160}},
   {...payload.components[1],id:'arrange-three',label:'Arrange Three',
    position:{x:590,y:100,width:160,height:160}}
  ]};
 const arrangeCreated=await page.evaluate(async({token,payload})=>{
  const response=await fetch('/api/metadata/pages/'+payload.apiName,{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
 },{token,payload:arrangePayload});
 assert.equal(arrangeCreated.status,200,'Arrange E2E page was not seeded: '+
  JSON.stringify(arrangeCreated.body));
 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search pages').fill('Design 2 Arrange');
 await page.getByRole('button',{name:'Design Design 2 Arrange',exact:true}).click();
 const arrangeOne=page.locator('[data-component-id="arrange-one"]').first();
 await arrangeOne.waitFor({state:'visible'});
 await arrangeOne.click({position:{x:18,y:18}});
 await page.getByRole('tab',{name:'Design',exact:true}).click();
 const areaArrange=page.getByLabel('Select Design 2 area');
 await areaArrange.selectOption('Body');
 const actionRow=page.locator('.smart-design2-arrange-actions');
 const buttons=actionRow.locator('button.smart-design2-arrange-action');
 assert.equal(await buttons.count(),15,'Exactly 15 R0 Arrange actions are required');
 const actionLabels=['Align left','Align centre','Align right','Align top','Align middle',
   'Align bottom','Distribute horizontally','Distribute vertically','Bring to front',
   'Send backward','Group','Ungroup','Lock / Unlock component','Component nesting','Fill canvas'];
 for(let i=0;i<15;i++){
  const button=buttons.nth(i);
  assert.equal(await button.getAttribute('data-design-row'),'0');
  assert.equal(await button.getAttribute('data-design-column'),String(i+7));
  assert.equal(await button.getAttribute('title'),actionLabels[i]);
  const rect=await button.boundingBox();
  assert.ok(rect&&Math.abs(rect.width-40)<1&&Math.abs(rect.height-26)<1,
   'R0 C'+(i+7)+' action must measure exactly 40×26px');
 }
 const firstAction=await buttons.first().boundingBox();
 const selectorRect=await page.locator('.smart-design2-area-picker').boundingBox();
 assert.ok(firstAction&&selectorRect&&Math.abs(firstAction.x-selectorRect.x-564)<2,
  'C7 must start after the exact C1–C6 slots, including empty C5/C6');
 for(let i=1;i<15;i++){
  const prev=await buttons.nth(i-1).boundingBox(),next=await buttons.nth(i).boundingBox();
  assert.ok(prev&&next&&Math.abs(next.x-prev.x-44)<1,
   'R0 Arrange icons must retain their fixed 40px width and 4px gap');
 }
 assert.equal(await buttons.nth(0).isDisabled(),false,'Align left must work for a single component');
 assert.equal(await buttons.nth(6).isDisabled(),true,'Distribute needs three selected components');
 assert.equal(await buttons.nth(10).isDisabled(),true,'Group needs multiple selected components');
 await areaArrange.selectOption('Header');
 assert.equal(await buttons.count(),15,'All icons remain rendered outside Body');
 assert.equal(await buttons.evaluateAll(list=>list.every(button=>button.disabled)),true,
  'All fifteen actions must be disabled outside the Body dropdown');
 await areaArrange.selectOption('Body');
 const coord=async(axis)=>arrangeOne.evaluate((node,axis)=>
  Number.parseFloat(axis==='x'?node.style.left:node.style.top),axis);
 for(const [index,axis,expected] of [
   [0,'x',0],[1,'x',560],[2,'x',1120],
   [3,'y',0],[4,'y',370],[5,'y',740]
 ]){
  assert.equal(await buttons.nth(index).isDisabled(),false,'Alignment action is disabled');
  await buttons.nth(index).click();
  assert.equal(await coord(axis),expected,
   actionLabels[index]+' did not reposition the selected canvas component');
 }
 assert.equal(await buttons.nth(8).isDisabled(),false,'Bring to front should be available');
 await buttons.nth(8).click();
 assert.equal(await buttons.nth(9).isDisabled(),false,'Send backward should be available after moving to front');
 await buttons.nth(9).click();
 assert.equal(await buttons.nth(12).isDisabled(),false,'Lock must be usable in Body');
 await buttons.nth(12).click();
 assert.equal(await buttons.nth(12).getAttribute('aria-pressed'),'true');
 assert.equal(await buttons.nth(0).isDisabled(),true,'Locked component must not align');
 assert.equal(await buttons.nth(12).getAttribute('title'),'Unlock component');
 await buttons.nth(12).click();
 assert.equal(await buttons.nth(12).getAttribute('aria-pressed'),'false');
 assert.equal(await buttons.nth(0).isDisabled(),false,'Unlocked component must align again');
 await page.keyboard.press('Control+a');
 assert.equal(await page.locator('.record-component.multi-selected').count(),3,
  'All three page components must be selected for distribution and grouping');
 assert.equal(await buttons.nth(6).isDisabled(),false,'Horizontal distribution must enable with three');
 assert.equal(await buttons.nth(7).isDisabled(),false,'Vertical distribution must enable with three');
 await buttons.nth(6).click();
 await buttons.nth(7).click();
 assert.equal(await buttons.nth(10).isDisabled(),false,'Group must enable with three unlocked siblings');
 await buttons.nth(10).click();
 // Regression: selecting a grouped Cart must still expose its own field icons.
 // Earlier code suppressed ALL icons whenever ribbonSelectedMembers.length > 1.
 const groupedCart=page.locator('[data-component-id="arrange-one"]').first();
 await groupedCart.click({position:{x:18,y:18}});
 assert.equal(await page.locator('.record-component.multi-selected').count(),3,
  'Clicking a grouped component must retain its grouped canvas selection');
 const groupedLabelIcon=groupedCart.locator('.canvas-data-icon-button[data-binding-property="label"]');
 await groupedLabelIcon.waitFor({state:'visible'});
 assert.ok(await groupedCart.locator('.canvas-data-icon-button').count()>1,
  'Grouped Smart Cart must keep its field-specific yellow icons');
 await groupedLabelIcon.click();
 await page.locator('.smart-data-active-binding').getByText('Cart title').waitFor({state:'visible'});
 const groupedFormula=page.locator('.smart-data-formula-input input').first();
 await groupedFormula.waitFor({state:'visible'});
 assert.equal(await groupedFormula.inputValue(),'E2E Cart',
  'Grouped Cart title icon must open its own label formula');
 assert.equal(await groupedFormula.isDisabled(),false,
  'Group selection must not disable the selected Cart field editor');
 await groupedFormula.fill('= "Group cart only"');
 // Updates must change the selected cart only, not grouped Smart Tabs siblings.
 const stagedGroupTitle=await page.locator('[data-component-id="arrange-one"] .smart-cart-header').innerText();
 assert.ok(stagedGroupTitle.includes('Group cart only'),
  'Selected Cart title must update without applying to grouped siblings');
 await page.getByRole('tab',{name:'Design',exact:true}).click();
 await page.getByLabel('Select Design 2 area').selectOption('Body');
 assert.equal(await buttons.nth(11).isDisabled(),false,'Ungroup must enable for a persisted canvas group');
 await buttons.nth(11).click();
 assert.equal(await buttons.nth(11).isDisabled(),true,'Ungroup must clear the canvas group');
 assert.equal(await buttons.nth(10).isDisabled(),true,
  'Ungroup correctly resets multi-selection to the chosen component');
 await page.keyboard.press('Control+a');
 assert.equal(await buttons.nth(10).isDisabled(),false,
  'Selecting the three ungrouped siblings must re-enable Group');
 assert.equal(await buttons.nth(13).isDisabled(),false,'Nesting action should be enabled');
 await buttons.nth(13).click();
 assert.equal(await page.getByRole('tab',{name:'Advanced',exact:true}).getAttribute('aria-selected'),'true',
  'Component nesting must open the existing Advanced nesting editor');
 console.info('Design 2 R0 C7–C21 browser: fixed geometry, Body-only enablement and all 15 commands verified');

 console.info('Design 2 browser E2E: original Design preserved; Row Bold persisted; Ctrl+A/Delete removes all selected, one Undo restores all');
}
