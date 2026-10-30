#!/usr/bin/env node
/** Narrow, repeatable source-filename retirement. API/data identities are not rewritten. */
import {access,mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const moves=[
  ['apps/web/src/core/components/SharedRuntime/OneSearch.jsx','apps/web/src/core/components/SharedRuntime/Search.jsx'],
  ['apps/web/src/core/components/SharedRuntime/OneText.jsx','apps/web/src/core/components/SharedRuntime/Text.jsx'],
  ['apps/web/src/component-libraries/shared/OneActions.jsx','apps/web/src/component-libraries/shared/Actions.jsx'],
  ['apps/web/src/component-libraries/shared/OneCardCore.jsx','apps/web/src/component-libraries/shared/CardCore.jsx'],
  ['apps/web/src/component-libraries/shared/OneData.jsx','apps/web/src/component-libraries/shared/Data.jsx'],
  ['apps/web/src/component-libraries/shared/OneDisplay.jsx','apps/web/src/component-libraries/shared/Display.jsx'],
  ['apps/web/src/component-libraries/shared/OneFieldExpression.js','apps/web/src/component-libraries/shared/FieldExpression.js'],
  ['apps/web/src/component-libraries/shared/OneFieldExpression.d.ts','apps/web/src/component-libraries/shared/FieldExpression.d.ts'],
  ['apps/web/src/component-libraries/shared/OneInputs.jsx','apps/web/src/component-libraries/shared/Inputs.jsx'],
  ['apps/web/src/component-libraries/shared/OneLayout.jsx','apps/web/src/component-libraries/shared/Layout.jsx'],
  ['apps/web/src/component-libraries/shared/OneTenantImage.jsx','apps/web/src/component-libraries/shared/TenantImage.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneData.jsx','apps/web/src/component-libraries/ui-runtime/shared/Data.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneDisplay.jsx','apps/web/src/component-libraries/ui-runtime/shared/Display.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneFrame.jsx','apps/web/src/component-libraries/ui-runtime/shared/Frame.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneInputs.jsx','apps/web/src/component-libraries/ui-runtime/shared/Inputs.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneLayout.jsx','apps/web/src/component-libraries/ui-runtime/shared/Layout.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneOptionGroups.jsx','apps/web/src/component-libraries/ui-runtime/shared/OptionGroups.jsx'],
  ['apps/web/src/component-libraries/ui-runtime/shared/UneSchedule.jsx','apps/web/src/component-libraries/ui-runtime/shared/Schedule.jsx']
];
const exists=async p=>{try{await access(p);return true}catch{return false}};
const ignored=new Set(['node_modules','.git','dist','dist-system','coverage','.cache','build','.next','.turbo']);
const extensions=new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.css','.scss','.html','.md','.yml','.yaml']);
async function walk(dir,items=[]){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(ignored.has(entry.name))continue;
  const p=path.join(dir,entry.name);
  if(entry.isDirectory())await walk(p,items);
  else if(entry.isFile()&&extensions.has(path.extname(p)))items.push(p);
 }
 return items;
}
for(const [oldName,newName] of moves){
 const old=path.join(root,oldName),target=path.join(root,newName);
 if(await exists(old)){
  if(await exists(target))throw Error('Refusing to overwrite '+newName);
  await mkdir(path.dirname(target),{recursive:true});
  await rename(old,target);
 }else if(!await exists(target))throw Error('Missing source and destination for '+oldName);
}
const names=new Map(moves.map(([a,b])=>[path.basename(a),path.basename(b)]));
let updates=0;
for(const file of await walk(root)){
 if(file.endsWith('/scripts/retire-legacy-helper-filenames.mjs'))continue;
 let text=await readFile(file,'utf8'),updated=text;
 // Only exact source basenames; never replace identifiers (OneEngine),
 // published component API keys, schema definitions, or arbitrary substrings.
 for(const [original,replacement] of names){
  updated=updated.split(original).join(replacement);
 }
 if(updated!==text){await writeFile(file,updated);updates++;}
}
for(const [a,b] of moves){
 if(await exists(path.join(root,a)))throw Error('Retired source still exists: '+a);
 if(!await exists(path.join(root,b)))throw Error('Destination missing: '+b);
}
console.log('Retired '+moves.length+' internal helper filenames; updated '+updates+' source references');
