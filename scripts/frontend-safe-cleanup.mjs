import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import postcss from 'postcss';

const repo=process.cwd();
const web=path.join(repo,'apps/web');
const source=path.join(web,'src');
const toRepo=p=>path.relative(repo,p).split(path.sep).join('/');
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const textExtensions=/\.(?:ts|tsx|js|jsx|mjs|cjs|css|json|html|md|yml|yaml|txt|svg)$/;
function list(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
  const p=path.join(dir,item.name);
  return item.isDirectory()?list(p):item.isFile()?[p]:[];
 });
}
function total(files){return files.reduce((n,p)=>n+fs.statSync(p).size,0)}
function bytes(dir){return total(list(dir))}
function metrics(label){
 const files=list(source);
 const css=files.filter(p=>p.endsWith('.css'));
 const dist=path.join(web,'dist');
 const renderers=path.join(dist,'component-library/components');
 const rendererFiles=list(renderers).filter(p=>p.endsWith('.json'));
 let initialJsBytes=null, initialJsAudit=null;
 if(fs.existsSync(dist)){
  try{
   const out=execFileSync('node',['scripts/verify-web-lazy-bundle.mjs','apps/web/dist'],{cwd:repo,encoding:'utf8',maxBuffer:10*1024*1024});
   const report=JSON.parse(out);
   initialJsBytes=report.eagerlyLoadedJsBytes;
   initialJsAudit={public:report.publicEagerlyLoadedJsAssets,authenticated:report.authenticatedEntries};
  }catch(err){initialJsAudit={error:String(err.message)}}
 }
 const result={
  label,sourceBytes:total(files),cssBytes:total(css),cssFileCount:css.length,
  sourceFileCount:files.length,webFileCount:list(web).filter(p=>!p.includes('/node_modules/')&&!p.includes('/dist/')).length,
  productionBuildBytes:fs.existsSync(dist)?bytes(dist):null,
  initialJsPayloadBytes:initialJsBytes,
  rendererAssetBytes:total(rendererFiles),
  rendererAssetFileCount:rendererFiles.length,
  initialJsAudit
 };
 console.log(JSON.stringify(result));
}
function cleanup(){
 const content=new Map();
 for(const rel of tracked){
  if(!textExtensions.test(rel)||rel==='package-lock.json')continue;
  const p=path.join(repo,rel);
  if(fs.existsSync(p)&&fs.statSync(p).size<2_000_000){
   try{content.set(rel,fs.readFileSync(p,'utf8'))}catch{}
  }
 }
 let removedCss=[],removedModules=[],importSpecifiers=0,importFiles=0,cssDuplicates=0,cssFiles=0;
 // Only literal, unreferenced core styles are candidates. Registered component
 // styles and files referenced by tests stay intact, including dynamic metadata CSS.
 const coreCss=list(path.join(source,'core')).filter(p=>p.endsWith('.css'));
 for(const p of coreCss){
  const rel=toRepo(p), base=path.basename(p);
  if([...content].some(([other,s])=>other!==rel&&s.includes(base)))continue;
  fs.unlinkSync(p);removedCss.push(rel);content.delete(rel);
 }
 // A TSX module under PageBuilder is removable only if *nothing* in the tracked
 // code, tests, registries or scripts names it; never apply this to catalog entries.
 const builder=path.join(source,'core/builders/PageBuilder');
 for(const p of list(builder).filter(p=>/\.(tsx|ts)$/.test(p))){
  const rel=toRepo(p), stem=path.basename(p).replace(/\.(tsx|ts)$/,'');
  if([...content].some(([other,s])=>other!==rel&&s.includes(stem)))continue;
  if(/^(?:index|types|constants|main)$/.test(stem.toLowerCase()))continue;
  fs.unlinkSync(p);removedModules.push(rel);content.delete(rel);
 }
 // Scope-independent conservative import pruning: remove only unused *named*
 // specifiers from an import that still retains another live specifier. The
 // module itself is always imported, preserving every possible side effect.
 for(const p of list(path.join(source,'core')).filter(p=>/\.(tsx|ts)$/.test(p))){
  const input=fs.readFileSync(p,'utf8');
  const sf=ts.createSourceFile(p,input,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(sf.parseDiagnostics.length)continue;
  const names=new Set();
  function visit(node){
   if(ts.isImportDeclaration(node)||ts.isImportEqualsDeclaration(node))return;
   if(ts.isIdentifier(node))names.add(node.text);
   ts.forEachChild(node,visit);
  }
  ts.forEachChild(sf,visit);
  const edits=[];
  for(const node of sf.statements){
   if(!ts.isImportDeclaration(node))continue;
   const spec=node.importClause?.namedBindings;
   if(!spec||!ts.isNamedImports(spec)||spec.elements.length<2)continue;
   const retained=spec.elements.filter(el=>names.has(el.name.text));
   if(retained.length===0||retained.length===spec.elements.length)continue;
   const replacement='{ '+retained.map(el=>el.getText(sf)).join(', ')+' }';
   edits.push({start:spec.getStart(sf),end:spec.end,replacement});
   importSpecifiers+=spec.elements.length-retained.length;
  }
  if(!edits.length)continue;
  let output=input;
  for(const edit of edits.sort((a,b)=>b.start-a.start)){
   output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);
  }
  const revised=ts.createSourceFile(p,output,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(revised.parseDiagnostics.length)throw Error('Import cleanup invalid syntax: '+toRepo(p));
  fs.writeFileSync(p,output);
  importFiles++;
 }
 // Adjacent identical declarations are cascade-equivalent in every supported
 // browser. Do NOT remove overrides, nonadjacent fallbacks or unmatched selectors.
 for(const p of list(source).filter(p=>p.endsWith('.css'))){
  const input=fs.readFileSync(p,'utf8');
  let root;
  try{root=postcss.parse(input,{from:p})}catch{continue}
  let changed=false;
  root.walkRules(rule=>{
   let previous=null;
   for(const node of [...(rule.nodes||[])]){
    if(node.type!=='decl'){previous=null;continue}
    if(previous && previous.prop===node.prop &&
       previous.value===node.value && previous.important===node.important){
      node.remove();cssDuplicates++;changed=true;continue;
    }
    previous=node;
   }
  });
  if(changed){fs.writeFileSync(p,root.toString());cssFiles++}
 }
 // A checked-in esbuild output is not source. Both dev and production already
 // generate it; dev must build it before Vite starts serving the sandbox iframe.
 const pkgPath=path.join(web,'package.json');
 const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
 pkg.scripts={predev:'node build-sandbox.mjs',...pkg.scripts};
 fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
 const ignorePath=path.join(repo,'.gitignore');
 const ignore=fs.readFileSync(ignorePath,'utf8');
 if(!ignore.split(/\r?\n/).includes('apps/web/public/component-sandbox.js'))
  fs.appendFileSync(ignorePath,(ignore.endsWith('\n')?'':'\n')+'apps/web/public/component-sandbox.js\n');
 execFileSync('git',['rm','--cached','--','apps/web/public/component-sandbox.js'],{cwd:repo,stdio:'inherit'});
 const result={removedCss,removedModules,removedSourceFileCount:removedCss.length+removedModules.length,
  importSpecifiers,importFiles,cssDuplicates,cssFiles,removedGeneratedAssets:['apps/web/public/component-sandbox.js']};
 fs.writeFileSync('/tmp/frontend-cleanup-summary.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
const mode=process.argv[2];
if(mode==='measure')metrics(process.argv[3]||'unknown');
else if(mode==='cleanup')cleanup();
else throw Error('Usage: node scripts/frontend-safe-cleanup.mjs measure|cleanup');
