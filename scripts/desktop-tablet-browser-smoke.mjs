// Source-backed UI surface acceptance. Uses the actual app CSS and common
// platform design tokens. This is a visual/accessibility contract, not a CRUD
// or payment workflow test; authenticated app flows are tested separately.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright';
const require=createRequire(import.meta.url);
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const root=file('apps/web/src/core/workspace/WorkspaceTheme/appleTheme.css');
const base=file('apps/web/src/core/workspace/WorkspaceTheme/design-system.css');
const accessibilityFindings=[];
const cases=[
 {name:'acetill',path:'apps/acetill/src/acetill-terminal.css',html:`
 <main class="acetill-terminal" aria-label="Point of sale">
  <section class="acetill-shop"><div class="acetill-topline">
   <nav class="acetill-category-tabs" aria-label="Categories"><button class="selected">All</button><button>Food</button><button>Drinks</button></nav>
   <label class="acetill-search">Find<input aria-label="Find products" placeholder="Search" /></label>
  </div><div class="acetill-product-grid">
   <button class="acetill-product"><span class="acetill-product-art">☕</span><span class="acetill-product-meta"><strong>Example product</strong><span>£4.00</span></span></button>
   <button class="acetill-product"><span class="acetill-product-art">☕</span><span class="acetill-product-meta"><strong>Second product</strong><span>£5.00</span></span></button>
  </div><div class="acetill-quick-actions"><button>Hold</button><button>Find sale</button><button>Discount</button><button>More</button></div></section>
  <aside class="acetill-current-order"><div class="acetill-order-heading"><h1>Current order</h1><button aria-label="Close order">×</button></div>
   <div class="acetill-lines"><div class="acetill-line"><span class="acetill-line-art">☕</span><span class="acetill-line-details"><strong>Example product</strong></span><span class="acetill-line-price">£4.00</span></div></div>
   <section class="acetill-checkout"><div class="acetill-total"><span>Total</span><strong>£4.00</strong></div><button class="acetill-charge">Charge £4.00</button></section>
  </aside></main>`},
 {name:'acekiosk',path:'apps/acekiosk/src/acekiosk.css',html:`
 <div class="ak-shell"><header class="ak-header"><strong>Self-service kiosk</strong><button class="ak-signout">Help</button></header>
 <main class="ak-main"><div class="ak-title"><h1>Menu</h1><button class="ak-cartbutton">Basket (1)</button></div>
 <div class="ak-menu-layout"><nav class="ak-categories" aria-label="Menu category"><button class="active">All</button><button>Food</button><button>Drinks</button></nav>
  <div class="ak-products"><article class="ak-product"><div class="ak-image">☕</div><div class="ak-product-body"><h2>Example meal</h2><p>Freshly prepared</p><div><span>£8.00</span><button>Add</button></div></div></article>
  <article class="ak-product"><div class="ak-image">🥗</div><div class="ak-product-body"><h2>Example salad</h2><p>Freshly prepared</p><div><span>£7.00</span><button>Add</button></div></div></article></div>
 </div></main></div>`},
 {name:'aceassist',path:'apps/aceassist/src/aceassist.css',html:`
 <div class="custom-aceassist"><main class="custom-assist"><header class="custom-heading"><div><h1>Appointments</h1><p>Plan and manage visits</p></div><label>Choose date<input type="date" value="2026-10-25"></label></header>
 <nav class="custom-tabs" aria-label="Appointment views"><button aria-current="page">Calendar</button><button>Clients</button><button>Invoices</button></nav>
 <div class="custom-assist-layout"><section class="custom-calendar"><div class="custom-panel-title"><h2>Week view</h2></div><div class="custom-week">
  <div class="custom-day"><small>Mon</small><button class="custom-visit">09:00 · Consultation</button></div>
  <div class="custom-day"><small>Tue</small></div><div class="custom-day"><small>Wed</small></div>
  <div class="custom-day"><small>Thu</small></div><div class="custom-day"><small>Fri</small></div>
  <div class="custom-day"><small>Sat</small></div><div class="custom-day"><small>Sun</small></div>
 </div></section><aside class="custom-visit-detail"><h2>Visit details</h2><dl><div><dt>Time</dt><dd>09:00</dd></div></dl></aside></div></main></div>`},

 // Supplemental screens catch regressions beyond each app's landing page.
 {name:'acekiosk-checkout',path:'apps/acekiosk/src/acekiosk.css',html:`
 <div class="ak-shell"><header class="ak-header"><span class="ak-header-label">Self-service kiosk</span></header>
 <main class="ak-main"><section class="ak-order"><h1>Your basket</h1>
 <div class="ak-orderline"><strong>Example meal</strong><p>Quantity 1</p><strong>£8.00</strong></div>
 <div class="ak-subtotal"><span>Total</span><strong>£8.00</strong></div>
 <div class="ak-paymethods"><button class="active">Card</button><button>Cash</button></div>
 <label class="ak-tender">Amount paid<input type="number" value="10" /></label>
 <button class="ak-primary">Confirm order</button></section></main>
 <div class="ak-floating"><button class="ak-basket-open">Show basket <span>1</span></button><button class="ak-place">Place order £8.00</button></div>
 </div>`},
 {name:'acekiosk-options',path:'apps/acekiosk/src/acekiosk.css',html:`
 <div class="ak-shell"><div class="ak-modal-backdrop"><section class="ak-modal" role="dialog" aria-modal="true" aria-label="Customise meal">
 <header class="ak-modal-top"><strong>Customise meal</strong><button>Close</button></header>
 <div class="ak-modal-body"><h2>Example meal</h2><fieldset class="ak-options"><legend>Choose a side</legend>
 <label class="ak-option selected"><input type="radio" name="side" checked /><span>Fries <small>Included</small></span></label>
 <label class="ak-option"><input type="radio" name="side" /><span>Salad <small>No charge</small></span></label>
 </fieldset></div><footer class="ak-modal-footer"><button class="ak-primary">Add to basket</button></footer>
 </section></div></div>`},
 {name:'acetill-receipt',path:'apps/acetill/src/acetill-terminal.css',html:`
 <div class="standalone-product"><main class="acetill-receipt-screen"><div class="acetill-receipt-panel">
 <h1>Payment complete</h1><p>Receipt ready</p><dl><div><dt>Paid</dt><dd>£8.00</dd></div></dl>
 <div class="acetill-receipt-actions"><button>Print receipt</button><button class="acetill-charge">New sale</button></div>
 </div></main></div>`},
 {name:'aceassist-editor',path:'apps/aceassist/src/aceassist.css',html:`
 <div class="custom-aceassist"><main class="custom-assist"><div class="assist-modal-backdrop">
 <section class="assist-modal" role="dialog" aria-modal="true" aria-label="Create appointment">
 <div class="assist-modal-heading"><h2>New appointment</h2></div>
 <form class="custom-crud-form"><label>Customer<input value="Example customer" /></label>
 <label>Start date<input type="date" value="2026-10-29" /></label>
 <div class="assist-modal-footer"><button type="button">Cancel</button><button type="submit">Save</button></div>
 </form></section></div></main></div>`},
 {name:'acechatter',path:'apps/acechatter/src/aceChatter.css',html:`
 <div class="ace-chat"><aside class="ace-chat-sidebar">
 <header class="ace-chat-brand"><strong>AceChatter</strong><button class="ace-chat-signout">Sign out</button></header>
 <div class="ace-chat-sidebar-heading"><h1>Messages</h1><button class="ace-chat-new-button">New</button></div>
 <label class="ace-chat-search">Search<input placeholder="Search conversations" /></label>
 <nav class="ace-chat-conversation-list" aria-label="Conversations"><button class="ace-chat-conversation selected">
 <span class="ace-chat-avatar">A</span><span class="ace-chat-conversation-copy"><strong>Example customer</strong><small>Latest message</small></span>
 </button></nav></aside>
 <main class="ace-chat-main"><div class="ace-chat-top"><span class="ace-chat-avatar">A</span>
 <span class="ace-chat-thread-heading"><strong>Example customer</strong><small>Connected</small></span></div>
 <div class="ace-chat-thread"><article class="ace-chat-bubble"><p>Can you help me?</p><small>10:20</small></article>
 <article class="ace-chat-bubble outgoing"><p>Of course.</p><small>10:21</small></article></div>
 <div class="ace-chat-compose"><div class="ace-chat-compose-row"><textarea aria-label="Write message" placeholder="Type a message"></textarea>
 <button class="ace-chat-send-button" aria-label="Send message">➤</button></div><small>Messages are private</small></div>
 </main></div>`},
 {name:'mail',path:'apps/web/src/core/mail/MailWebmail.css',html:`
 <div class="md-mail"><header class="md-mail-header"><strong class="md-mail-brand">Mail</strong>
 <label class="md-mail-search">Search mail<input aria-label="Search mail"></label><div class="md-mail-header-actions"><button class="md-mail-icon-button">Refresh</button></div></header>
 <div class="md-mail-layout"><aside class="md-mail-sidebar"><button class="md-mail-compose-button">Compose</button>
 <nav aria-label="Mailboxes"><button class="md-mail-folder is-active">Inbox</button><button class="md-mail-folder">Sent</button></nav></aside>
 <main class="md-mail-main"><div class="md-mail-list-toolbar"><div class="md-mail-list-heading"><h1>Inbox</h1></div></div>
 <div class="md-mail-message-list"><button class="md-mail-message-row is-unread"><span>●</span><strong class="md-mail-row-sender">Example sender</strong><span class="md-mail-row-content">Appointment confirmation</span><time class="md-mail-row-date">Today</time></button>
 <button class="md-mail-message-row"><span>○</span><strong class="md-mail-row-sender">Service</strong><span class="md-mail-row-content">Message preview</span><time class="md-mail-row-date">Yesterday</time></button>
 </div></main></div></div>`},
 {name:'setup',path:'apps/web/src/core/workspace/WorkspaceTheme/applicationPolish.css',html:`
 <main class="lightning home-content"><section class="welcome-banner"><div class="welcome-copy"><h1>Setup Home</h1><h2>Welcome to Setup</h2><p>Configure your organisation</p></div>
 <div class="welcome-quick"><strong class="quick-label">Quick access</strong><button>Object Manager</button><button>Flows</button><button>Permissions</button></div></section>
 <nav aria-label="Setup shortcuts" class="shortcut-grid"><button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Object Manager</span><span class="shortcut-description">Manage objects and relationships</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Page Builder</span><span class="shortcut-description">Create and edit application pages</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Flows</span><span class="shortcut-description">Build automated business processes</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Reports</span><span class="shortcut-description">Create and run reports</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Dashboards</span><span class="shortcut-description">Visualise key metrics</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">AppExchange</span><span class="shortcut-description">Discover organisation apps</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Company Settings</span><span class="shortcut-description">Manage organisation settings</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>
<button class="shortcut-card"><span class="shortcut-icon" aria-hidden="true">▣</span><span class="shortcut-title">Permission Sets</span><span class="shortcut-description">Manage access to apps and data</span><span class="shortcut-arrow" aria-hidden="true">→</span></button></nav>
 <section class="home-lower-grid"><div class="surface recent-surface"><header class="section-heading"><h2>Recent security activity</h2></header></div>
 <div class="surface help-surface"><header class="section-heading"><h2>Resources</h2></header></div></section></main>`},
 {name:'permissions',path:'apps/web/src/core/workspace/WorkspaceTheme/applicationPolish.css',html:`
 <main class="lightning permissions-page"><h1>Permissions</h1><nav class="permission-tabs" aria-label="Permission sections"><button class="active">Permission sets</button><button>Users</button></nav>
 <section class="permission-workspace"><aside class="permission-list"><h2>Policies</h2><button class="permission-list-item selected">Tenant Developer</button></aside>
 <div class="permission-editor"><h2>Object permissions</h2><div class="permission-table-wrap permission-desktop-matrix">
 <table><thead><tr><th>Object</th><th>Read</th><th>Edit</th></tr></thead><tbody><tr><th>Account</th><td><input type="checkbox" aria-label="Read Account" checked></td><td><input type="checkbox" aria-label="Edit Account"></td></tr></tbody></table>
 </div></div></section></main>`},
];
mkdirSync('artifacts',{recursive:true});
const selectedEngine=process.env.METADRIVE_UI_SMOKE_BROWSER||'chromium';
if(!['chromium','webkit'].includes(selectedEngine))throw Error('Unsupported UI smoke engine: '+selectedEngine);
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>name===selectedEngine)){
 const browser=await browserType.launch({headless:true});
 try{
  for(const {width,height} of [{width:834,height:1194},{width:1194,height:834},{width:1440,height:900}]){
   for(const scheme of ['light','dark']){
    const page=await browser.newPage({viewport:{width,height},colorScheme:scheme,hasTouch:width===834,deviceScaleFactor:1});
    try{
     for(const scenario of cases){
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">'+scenario.html+'</body></html>');
      await page.addStyleTag({content:base+'\n'+(scenario.name==='setup' ? file('apps/web/src/core/workspace/WorkspaceTheme/styles.css')+'\n' : '')+root+'\n'+file(scenario.path)+(scenario.name==='setup'?'\n'+file('apps/web/src/core/workspace/WorkspaceTheme/settingsAppearance.css'):'' )});
      const state=await page.evaluate(()=>{
       const element=document.querySelector('main')||document.body;
       const focusables=[...document.querySelectorAll('button,input,select')].filter(el=>el.getClientRects().length>0);
       return {width:document.documentElement.scrollWidth,viewport:window.innerWidth,
        buttons:focusables.length,ink:getComputedStyle(element).color};
      });
      assert.ok(state.width<=width+3,
       `${scenario.name} ${engine} ${width} ${scheme} has horizontal overflow: ${JSON.stringify(state)}`);
      assert.ok(state.buttons>0,`Missing interactive controls on ${scenario.name}`);
      if(scenario.name==='setup'){
       const cards=await page.locator('.shortcut-card').evaluateAll(nodes=>nodes.map(card=>{
        const icon=card.querySelector('.shortcut-icon').getBoundingClientRect();
        const title=card.querySelector('.shortcut-title').getBoundingClientRect();
        const description=card.querySelector('.shortcut-description').getBoundingClientRect();
        const outer=card.getBoundingClientRect();
        return {iconRight:icon.right,titleLeft:title.left,descLeft:description.left,outerRight:outer.right,descRight:description.right,iconWidth:icon.width};
       }));
       assert.equal(cards.length,8,'Fixture must represent all eight actual Setup shortcuts');
       assert.ok(cards.every(card=>card.iconWidth===50&&card.iconRight+4<=card.titleLeft&&card.iconRight+4<=card.descLeft&&card.descRight<=card.outerRight),
        `Setup shortcut icon/text overlaps at ${width}px: ${JSON.stringify(cards)}`);
      }
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=>{
       const result=await window.axe.run(document.body,
        {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
       return result.violations.filter(item=>['critical','serious'].includes(item.impact))
        .map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.slice(0,10).map(node=>({
        target:node.target,reason:node.failureSummary?.slice(0,180)}))}));
      });
      if(violations.length){
       const finding={app:scenario.name,engine,width,scheme,violations};
       accessibilityFindings.push(finding);
       console.error('Accessibility regression:',JSON.stringify(finding));
      }
      if(width===834 || width===1440){
       await page.screenshot({path:`artifacts/${scenario.name}-${engine}-${width}-${scheme}.png`,fullPage:true});
      }
      console.log('Desktop/tablet UI fixture passed',scenario.name,engine,width,scheme);
     }
    }finally{await page.close();}
   }
  }
  // Verify the same native-control selectors used by Page Builder and published
  // Page Runtime. Property styles must not paint invisible metadata frames.
  const native=await browser.newPage({viewport:{width:1024,height:768}});
  try{
   await native.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
   <body>
    <div id="buttonHost" class="record-component" data-page-appearance="button" data-page-style="background radius padding" style="--md-page-background:#112233;--md-page-radius:13px;--md-page-padding:8px">
      <div class="registered-component"><div class="one-ui"><button class="one-btn">Run configured Flow</button></div></div>
    </div>
    <div id="tabsHost" class="record-component" data-page-appearance="tabs" data-page-style="background" style="--md-page-background:#abcdee">
      <div class="registered-component"><div class="one-tabs"><button class="one-tab">Details</button></div></div>
    </div>
    <div id="borderHost" class="registered-component md-component-appearance" style="--md-border-width:6px">
      <div class="one-ui"><button class="one-btn">Native width</button></div>
    </div>
   </body></html>`);
   // Load independent runtime stylesheets exactly as production does. Combining
   // them can invalidate later rule blocks when imported CSS contains directives.
   await native.addStyleTag({content:file('apps/web/src/one/shared/one.css')});
   await native.addStyleTag({content:file('apps/web/src/core/components/RegisteredComponent/registeredComponentAppearance.css')});
   await native.addStyleTag({content:file('apps/web/src/core/pages/TemplatePageRuntime/pageComponentAppearance.css')});
   // OneButton transitions background for 150ms. Read the settled state rather
   // than sampling an intermediate colour immediately after style injection.
   await native.waitForTimeout(250);
   const state=await native.evaluate(()=>{
    const style=selector=>getComputedStyle(document.querySelector(selector));
    return {
     buttonHostBg:style('#buttonHost').backgroundColor,
     buttonBg:style('#buttonHost .one-btn').backgroundColor,
     buttonRadius:style('#buttonHost .one-btn').borderTopLeftRadius,
     buttonPadding:style('#buttonHost .one-btn').paddingTop,
     tabsHostBg:style('#tabsHost').backgroundColor,
     tabsContainerBg:style('#tabsHost .one-tabs').backgroundColor,
     tabButtonBg:style('#tabsHost .one-tab').backgroundColor,
     borderHostWidth:style('#borderHost').borderTopWidth,
     borderButtonWidth:style('#borderHost .one-btn').borderTopWidth,
     nativeBackgroundVar:style('#buttonHost .one-btn').getPropertyValue('--md-page-background'),
     nativeMatches:document.querySelectorAll('[data-page-appearance="button"][data-page-style~="background"] .registered-component .one-btn').length,
     ruleCounts:[...document.styleSheets].map(sheet=>sheet.cssRules.length),
     backgroundRules:[...document.styleSheets].flatMap(sheet=>[...sheet.cssRules])
       .filter(rule=>rule.selectorText?.includes('[data-page-appearance="button"][data-page-style~="background"]') && rule.style)
       .map(rule=>({background:rule.style.getPropertyValue('background-color'),priority:rule.style.getPropertyPriority('background-color')})).slice(-4)
    };
   });
   console.log('Published native appearance computed',engine,JSON.stringify(state));
   assert.equal(state.buttonHostBg,'rgba(0, 0, 0, 0)','No decorative Builder frame');
   assert.equal(state.buttonBg,'rgb(17, 34, 51)','Native button receives background');
   assert.equal(state.buttonRadius,'13px','Native button receives radius');
   assert.equal(state.buttonPadding,'8px','Native button receives padding');
   assert.equal(state.tabsHostBg,'rgba(0, 0, 0, 0)','No decorative tab frame');
   assert.equal(state.tabsContainerBg,'rgb(171, 205, 238)','Style tab container');
   assert.notEqual(state.tabButtonBg,'rgb(171, 205, 238)','Do not repaint individual tabs');
   assert.equal(state.borderHostWidth,'0px','Registered metadata host has no border');
   assert.equal(state.borderButtonWidth,'6px','Registered native control receives border');
   console.log('Native appearance parity fixture passed',engine);
  }finally{await native.close();}
 }finally{await browser.close();}
}

assert.deepEqual(accessibilityFindings,[],`Blocking application accessibility issues: ${JSON.stringify(accessibilityFindings,null,2)}`);
