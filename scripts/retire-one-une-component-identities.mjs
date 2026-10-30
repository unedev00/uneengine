#!/usr/bin/env node
// Rehome legacy component sources; preserve caller-facing metadata via SQL migration.
import fs from 'node:fs';
import {readdir,readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),lib=path.join(root,'apps/web/src/component-libraries');
const skip=new Set(['.git','node_modules','dist','dist-system','coverage','build','.cache','.turbo']);
const exts=new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.css','.scss','.html','.md','.yaml','.yml','.sql']);
const walk=async (p,a=[])=>{for(const e of await readdir(p,{withFileTypes:true})){if(skip.has(e.name))continue;const f=path.join(p,e.name);if(e.isDirectory())await walk(f,a);else if(exts.has(path.extname(f)))a.push(f);}return a;};
if(!fs.existsSync(lib))throw Error('Missing component library');
const dirs=(await readdir(lib,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
if(dirs.includes('ui_button')){console.log('Already migrated');process.exit(0);}
const oldUi=dirs.filter(x=>/^une_[a-z][a-z0-9_]*$/.test(x));
if(oldUi.length!==34)throw Error('Expected 34 une components; got '+oldUi.length);
const moves=oldUi.map(n=>({old:path.join(lib,n),next:path.join(lib,'ui_'+n.slice(4)),type:'ui'}));
if(dirs.includes('une'))moves.push({old:path.join(lib,'une'),next:path.join(lib,'ui-runtime'),type:'runtime'});
for(const n of dirs.filter(x=>/^One[A-Z]/.test(x)))moves.push({old:path.join(lib,n),next:path.join(lib,'shared/primitives',n.slice(3)),type:'primitive',name:n});
const original=await walk(root),known=new Set(original);
const mapped=p=>{for(const m of moves){if(p!==m.old&&!p.startsWith(m.old+path.sep))continue;let tail=path.relative(m.old,p);if(m.type==='ui'&&/^Une[A-Z].*\.(jsx|css)$/.test(tail))tail='Ui'+tail.slice(3);if(m.type==='primitive'&&tail.startsWith(m.name+'.'))tail=m.name.slice(3)+tail.slice(m.name.length);return path.join(m.next,tail);}return p;};
const folderMapped=p=>{for(const m of moves)if(p===m.old||p.startsWith(m.old+path.sep))return path.join(m.next,path.relative(m.old,p));return p;};
for(const m of moves){if(fs.existsSync(m.next))throw Error('Collision '+m.next);await mkdir(path.dirname(m.next),{recursive:true});await rename(m.old,m.next);}
let changed=0;
for(const old of original){
 const dest=mapped(old);
 if(dest.endsWith('/scripts/retire-one-une-component-identities.mjs'))continue;
 const physical=folderMapped(old);
 let before=await readFile(physical,'utf8'),after=before;
 after=after.replace(/(["'])(\.\.?\/[^"'\s]+)\1/g,(full,q,relative)=>{
  const target=path.resolve(path.dirname(old),relative);
  if(!known.has(target)&&!original.some(f=>f.startsWith(target+path.sep)))return full;
  const newTarget=mapped(target);
  if(old===dest&&target===newTarget)return full;
  let next=path.relative(path.dirname(dest),newTarget).split(path.sep).join('/');
  if(!next.startsWith('.'))next='./'+next;
  return q+next+q;
 });
 after=after.replace(/component-libraries\/une_([a-z0-9_]+)\//g,'component-libraries/ui_$1/')
            .replace(/component-libraries\/une\/shared\//g,'component-libraries/ui-runtime/shared/')
            .replace(/component-libraries\/One([A-Z][A-Za-z0-9]*)\/One\1\./g,(_,n)=>'component-libraries/shared/primitives/'+n+'/'+n+'.');
 if(!dest.endsWith('.sql')&&!dest.includes('legacy-une-tenant-retirement.test.ts')){
   after=after.replace(/\bune_([a-z][a-z0-9_]*)\b/g,'ui_$1');
   if(!dest.endsWith('/bundledRegistryClient.ts'))after=after.replace(/(['\"])une_\1/g,'$1ui_$1');
 }
 if(dest.endsWith('/component.json'))
   after=after.replace(/\/Une([A-Z][A-Za-z0-9]*)\.(jsx|css)/g,'/Ui$1.$2');
 if(dest.includes('/component-libraries/ui_')&&dest.endsWith('.jsx'))
   after=after.replace(/\bfunction Une([A-Z][A-Za-z0-9]*)\b/g,'function Ui$1');
 if(after!==before){await writeFile(physical,after);changed++;}
}
for(const m of moves){
 if(!['ui','primitive'].includes(m.type))continue;
 for(const f of await walk(m.next)){
  const base=path.basename(f);
  const name=m.type==='ui'&&/^Une[A-Z].*\.(jsx|css)$/.test(base)?'Ui'+base.slice(3):
    m.type==='primitive'&&base.startsWith(m.name+'.')?m.name.slice(3)+base.slice(m.name.length):base;
  if(name!==base)await rename(f,path.join(path.dirname(f),name));
 }
 if(m.type==='primitive')await rm(path.join(m.next,'component.json'),{force:true});
}
if((await readFile(path.join(lib,'manifest.json'),'utf8')).includes('une_'))throw Error('Old UNE manifest entry');
console.log('Migrated '+moves.length+' directories; updated '+changed+' files');
