import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const worker=fileURLToPath(new URL('../../scripts/mail-protocol.py',import.meta.url));
function run(input:unknown){
 const result=spawnSync('python3',[worker],{input:JSON.stringify(input),encoding:'utf8',timeout:7000});
 assert.equal(result.status,0,result.stderr||'Worker should exit cleanly');
 return JSON.parse(result.stdout) as {ok:boolean;error?:string};
}
test('Docker IMAP SMTP worker rejects unsupported operations before connecting',()=>{
 const result=run({action:'run_shell',username:'someone@example.com',password:'secret'});
 assert.equal(result.ok,false);
 assert.match(result.error??'',/Unknown mail operation/);
});
test('Docker IMAP SMTP worker rejects missing credentials without network access',()=>{
 const result=run({action:'login',username:'support@unesolutions.co.uk'});
 assert.equal(result.ok,false);
 assert.match(result.error??'',/Mailbox credentials required/);
});
test('Docker IMAP SMTP worker never echoes invalid mailbox credentials',()=>{
 const password='test-secret-never-echo';
 const result=run({action:'login',username:'malicious\nuser@example.com',password});
 assert.equal(result.ok,false);
 assert.equal(JSON.stringify(result).includes(password),false);
});


test('IMAP LIST parsing preserves real folder IDs and supports quoted, bare and literal names',()=>{
 const probe=String.raw`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('mail_protocol',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
rows=[
 b'(\\HasNoChildren) "/" INBOX',
 b'(\\HasNoChildren) "/" Drafts',
 b'(\\HasNoChildren) "/" "Sent Items"',
 b'(\\HasChildren) "/" "Projects/2026"',
 b'(\\HasNoChildren) NIL "Folder \\"Q\\""',
 (b'(\\HasNoChildren) "/" {13}',b'Billing Cases'),
 b'(\\Noselect) "/" "Unselectable"'
]
folders=module.parse_imap_folders(rows)
print(json.dumps({'folders':folders,'selected':module.imap_mailbox_arg('Sent Items')}))`;
 const result=spawnSync('python3',['-c',probe,worker],{encoding:'utf8',timeout:7000});
 assert.equal(result.status,0,result.stderr||result.stdout);
 const parsed=JSON.parse(result.stdout) as {folders:Array<{id:string;name:string}>;selected:string};
 assert.deepEqual(parsed.folders.map(x=>x.id),['INBOX','Drafts','Sent Items','Projects/2026','Folder "Q"','Billing Cases']);
 assert.deepEqual(parsed.folders.map(x=>x.name),parsed.folders.map(x=>x.id));
 assert.equal(parsed.selected,'"Sent Items"');
});

test('IMAP worker selects canonical inbox and folders containing spaces',()=>{
 const probe=String.raw`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('mail_protocol',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Fake:
 def __init__(self):self.selections=[]
 def login(self,user,password):return ('OK',[b'Logged in'])
 def list(self):return ('OK',[b'(\\HasNoChildren) "/" INBOX',b'(\\HasNoChildren) "/" "Sent Items"'])
 def select(self,folder,readonly=True):
  self.selections.append(folder)
  return ('OK',[b'0'])
 def response(self,key):return ('UIDVALIDITY',[b'100'])
 def uid(self,*args):return ('OK',[b''])
 def logout(self):return ('BYE',[b'Goodbye'])
fake=Fake()
module.imaplib.IMAP4_SSL=lambda *args,**kw:fake
login={'username':'test@example.com','password':'placeholder'}
folders=module.work({**login,'action':'folders'})
messages=module.work({**login,'action':'messages','folder':folders['folders'][0]['id']})
module.work({**login,'action':'messages','folder':folders['folders'][1]['id']})
print(json.dumps({'folders':folders['folders'],'selections':fake.selections,'messages':messages['messages']}))`;
 const result=spawnSync('python3',['-c',probe,worker],{encoding:'utf8',timeout:7000});
 assert.equal(result.status,0,result.stderr||result.stdout);
 const parsed=JSON.parse(result.stdout) as {folders:Array<{id:string}>;selections:string[];messages:unknown[]};
 assert.deepEqual(parsed.folders.map(x=>x.id),['INBOX','Sent Items']);
 assert.deepEqual(parsed.selections,['"INBOX"','"Sent Items"']);
 assert.deepEqual(parsed.messages,[]);
});
