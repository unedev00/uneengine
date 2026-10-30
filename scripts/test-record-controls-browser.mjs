import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin='http://127.0.0.1:4190';
const {createServer}=await import('vite');
const server=await createServer({root:fileURLToPath(new URL('../apps/web/',import.meta.url)),
 configFile:fileURLToPath(new URL('../apps/web/vite.config.ts',import.meta.url)),
 server:{host:'127.0.0.1',port:4190,strictPort:true}});
await server.listen();
let browser;
try{
 for(let attempt=0;attempt<100;attempt++){
  try{if((await fetch(origin)).ok)break;}catch{}
  if(attempt===99)throw new Error('Record controls test server did not start');
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 browser=await chromium.launch({headless:true,...(process.env.RECORD_TEST_CHROMIUM?{executablePath:process.env.RECORD_TEST_CHROMIUM}:{})});
 const page=await browser.newPage({timezoneId:'UTC'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/test/fixtures/record-parity/index.html');
 const section=name=>page.getByRole('region',{name,exact:true});
 const edit=async name=>{await section(name).getByRole('button',{name:'Edit '+name,exact:true}).click();};
 const save=async name=>{await section(name).getByRole('button',{name:'Save',exact:true}).click();await section(name).getByRole('button',{name:'Edit '+name,exact:true}).waitFor();return JSON.parse(await page.locator('[data-testid="saved"]').textContent());};
 await edit('Address');await page.getByRole('textbox',{name:'Address Street',exact:true}).fill('10 Main Street');
 assert.deepEqual(await save('Address'),{Address:{street:'10 Main Street'}});
 await edit('Location');await page.getByRole('spinbutton',{name:'Location latitude',exact:true}).fill('51.5');
 await page.getByRole('spinbutton',{name:'Location longitude',exact:true}).fill('-0.1');
 assert.deepEqual(await save('Location'),{Location:{latitude:51.5,longitude:-0.1}});
 await edit('Tags');await section('Tags').locator('select[multiple]').selectOption(['One','Two']);
 assert.deepEqual(await save('Tags'),{Tags:'One;Two'});
 await edit('Controller');await section('Controller').locator('select[name="Controller"]').selectOption('B');
 await section('Controller').locator('select[name="Dependent"]').selectOption('B1');
 assert.deepEqual(await save('Controller'),{Controller:'B',Dependent:'B1'});
 await edit('Moment');const date=section('Moment').locator('input[type="datetime-local"]');
 assert.ok((await date.inputValue()).includes('12:34:56'));
 await date.fill('2026-11-01T09:15:30');
 assert.deepEqual(await save('Moment'),{Moment:'2026-11-01T09:15:30.000Z'});
 await edit('Parent');await section('Parent').getByRole('button',{name:'Search Parent for Parent'}).click();
 await page.getByRole('option',{name:'Parent one'}).click();
 assert.deepEqual(await save('Parent'),{Parent:'parent-1'});
 assert.equal(await section('Protected').getByRole('button').count(),0);
 const preview=page.getByRole('button',{name:'Preview Children'});
 await preview.click();await page.getByText('Preview records',{exact:true}).waitFor();
 await preview.press('Escape');assert.equal(await page.getByText('Preview records',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 console.info('Browser controls passed: address, geolocation, multi-select, dependent picklists, datetime, lookup, read-only and Quick Links');
}finally{if(browser)await browser.close();await server.close();}
