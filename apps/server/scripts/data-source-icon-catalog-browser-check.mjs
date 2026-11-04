import assert from 'node:assert/strict';

/** Full renderer/position smoke on an isolated SQL tenant and real compiled Page Builder. */
export async function runDataSourceIconCatalogCheck({page,origin,db,tenantId,token}){
 const names=[
  'smart_button','smart_toggle','smart_lookup','smart_tabs','smart_text',
  'smart_textbox','smart_label','smart_card_grid','smart_image','smart_calendar',
  'smart_navigation','smart_container','smart_cart','smart_icon','smart_table'
 ];
 assert.equal(new Set(names).size,15);
 for(const api of names){
  await db.query(`INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
   VALUES($1,$2,$3,true) ON CONFLICT(tenant_id,api_name) DO NOTHING`,
  [tenantId,api,'one-bundled:'+api]);
 }
 const props={
  smart_button:{label:'Pay'},
  smart_toggle:{textSource:'@Enabled'},
  smart_lookup:{label:'Search records',textSource:'@Name'},
  smart_tabs:{tabs:['All','Desserts','Drinks'],tabCount:3},
  smart_text:{label:'Input',textSource:'@Name'},
  smart_textbox:{label:'Customer',textSource:'@Name'},
  smart_label:{label:'Heading',textSource:'@Name'},
  smart_card_grid:{textSource:'@Name',imageSource:'@ImageUrl',cardButtonText:'Add',
   cardDescription:'@Description',cardValue:'@Price',cardsPerRow:2,cardsPerColumn:1},
  smart_image:{imageSource:'@ImageUrl',textSource:'Image caption'},
  smart_calendar:{selectedDate:'2026-11-04'},
  smart_navigation:{items:['Home','Products','Settings'],textSource:'@Name'},
  smart_container:{},
  smart_cart:{label:'Current order',textSource:'@Name',imageSource:'@ImageUrl',
   column2Source:'@Price',column3Source:'@Quantity',subtotalValue:'@Subtotal',totalValue:'@Total'},
  smart_icon:{},
  smart_table:{objectApiName:'ReviewCase',column2Source:'@Name'}
 };
 const pageName='browsericoncatalog';
 const payload={apiName:pageName,label:'Data Icon Catalog',targetObject:'',pageType:'App Page',
  layoutMode:'free-canvas',canvasWidth:1360,canvasHeight:2100,status:'Draft',
  devices:['Desktop'],activationAssignments:[],
  components:names.map((api,i)=>({
   id:'binding-'+api,type:'Custom:'+api,label:api,region:'main',visible:true,
   properties:props[api],
   position:{x:18+i%3*440,y:18+Math.floor(i/3)*410,width:405,height:380}
  }))
 };
 const saved=await page.evaluate(async({token,payload})=>{
  const response=await fetch('/api/metadata/pages/'+payload.apiName,{
   method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
  return {status:response.status,body:await response.json().catch(()=>null)};
 },{token,payload});
 assert.equal(saved.status,200,'Cannot seed full Smart icon catalog: '+JSON.stringify(saved.body));
 await page.goto(origin+'/une/setup/page-builder',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search pages').fill('Data Icon Catalog');
 await page.getByRole('button',{name:'Design Data Icon Catalog',exact:true}).click();
 const noFields=new Set(['smart_container','smart_icon']);
 let audited=0,anchored=0;
 for(const api of names){
  const host=page.locator('[data-component-id="binding-'+api+'"]').first();
  await host.waitFor({state:'attached',timeout:15000});
  await host.scrollIntoViewIfNeeded();
  // Pick the real component frame, not a nested control in preview.
  await host.click({position:{x:5,y:5},force:true});
  const selected=page.locator('.record-component.selected[data-component-id="binding-'+api+'"]');
  await selected.waitFor({state:'attached',timeout:15000});
  const result=await selected.evaluate(root=>{
   const targets=[...root.querySelectorAll('[data-md-bind]')];
   const buttons=[...root.querySelectorAll('.canvas-data-icon-button')];
   return {targets:targets.length,icons:buttons.length,details:buttons.map(icon=>{
    const key=icon.getAttribute('data-binding-property');
    const box=icon.getBoundingClientRect();
    const matches=targets.filter(target=>
      (target.getAttribute('data-md-bind')||'').split(/\s+/).includes(key));
    return {key,attached:matches.some(target=>{
     const bounds=target.getBoundingClientRect();
     return box.top>=bounds.top-24&&box.bottom<=bounds.bottom+24&&
      box.left>=bounds.left-28&&box.right<=bounds.right+28;
    }),at:Math.round(box.x)+':'+Math.round(box.y)};
   })};
  });
  assert.ok(result.details.every(item=>item.attached),api+' has an icon away from its field: '+JSON.stringify(result));
  assert.equal(new Set(result.details.map(item=>item.at)).size,result.icons,
   api+' has overlapping icons');
  if(noFields.has(api))assert.equal(result.icons,0,api+' must not invent bindings');
  else if(api!=='smart_table')assert.ok(result.icons>0,
   api+' must expose at least one visible binding in Builder');
  if(api==='smart_tabs'){
   assert.equal(result.details.filter(item=>item.key==='tabCaptionFormula').length,3,
    'Each static tab has its own caption target');
   assert.ok(!result.details.some(item=>item.key==='label'||item.key==='collectionFormula'),
    'Generic Label and collection cannot be attached to tab captions');
  }
  // Every visible icon is a control, not merely a visual marker: verify that
  // its click opens exactly that field in the ONE shared Formula Bar.
  const iconButtons=selected.locator('.canvas-data-icon-button');
  for(let index=0;index<result.icons;index++){
   const button=iconButtons.nth(index);
   const target=await button.getAttribute('title');
   const expected=target?.match(/^Edit (.+) in Data formula bar$/)?.[1];
   assert.ok(expected,api+' has an unnamed binding icon '+index);
   await button.click({timeout:5000});
   await page.locator('.smart-data-active-binding').getByText(expected,{exact:true})
    .waitFor({state:'visible',timeout:5000});
   assert.equal(await page.locator('.smart-data-formula-input input').count(),1,
    api+' '+expected+' must own a single Formula Bar input');
  }
  audited++;anchored+=result.icons;
 }
 assert.equal(audited,15);
 console.info('Smart inline data source browser catalog: '+audited+
  ' component types checked and '+anchored+' field-anchored yellow icons verified');
}
