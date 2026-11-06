import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import {webSourceRoot} from '../../scripts/component-catalog.mjs';
import { rendererFileName, compressRenderer } from './component-delivery.mjs';
import { loadComponentCatalog, buildBundledComponent } from '../../scripts/component-catalog.mjs';

const catalog = await loadComponentCatalog();
const components = [];
const index = [];
await mkdir('dist/component-library/components', { recursive: true });
// Off by default: existing renderer format remains available for rollback.
const sharedSmartEnabled=process.env.METADRIVE_SHARED_SMART_RUNTIME==='1';
let sharedRuntimePath='';
if(sharedSmartEnabled){
 const source=await buildBundledComponent({
  apiName:'smart_runtime',
  jsxFile:'component-libraries/smart/shared/SmartRuntime.jsx',
  cssFile:'component-libraries/smart_button/SmartComponent.css'
 });
 const serialized=JSON.stringify({compiledJs:source.compiledJs});
 const filename=rendererFileName('smart_runtime',serialized);
 sharedRuntimePath='component-library/components/'+filename;
 const {gzip,brotli}=compressRenderer(serialized);
 await Promise.all([
  writeFile('dist/'+sharedRuntimePath,serialized),
  writeFile('dist/'+sharedRuntimePath+'.gz',gzip),
  writeFile('dist/'+sharedRuntimePath+'.br',brotli)
 ]);
}
for (const component of catalog.components) {
  const built = { ...component, ...await buildBundledComponent(component) };
  const appOwned=component.apiName.startsWith('ui_');
  const defaultProps=appOwned?Object.fromEntries((component.propertyDefinitions??[])
    .filter(def=>Object.prototype.hasOwnProperty.call(def,'defaultValue'))
    .map(def=>[def.propertyKey,def.defaultValue])):{};
  // The compiled component stays usable, but SQL/public indexes never receive
  // UNE property definitions. App-owned defaults ship with the renderer asset.
  components.push(appOwned?{...built,propertyDefinitions:[]}:built);
  const smartWrapper=sharedSmartEnabled&&component.apiName.startsWith('smart_')
   &&typeof component.jsxFile==='string'
   &&component.jsxFile.endsWith('/SmartComponent.jsx')
   &&(await readFile(path.join(webSourceRoot,component.jsxFile),'utf8'))
     .includes('kind="'+component.apiName+'"')
   &&(await readFile(path.join(webSourceRoot,component.jsxFile),'utf8'))
     .includes('import SmartRuntime from "../smart/shared/SmartRuntime.jsx"');
  const asset=JSON.stringify({
    apiName:component.apiName,version:component.version,
    compiledJs:smartWrapper?'':built.compiledJs,
    ...(smartWrapper?{sharedSmartRuntime:true,sharedRuntimePath}:{}),
    scopedCss:built.cssSource,defaultProps
  });
  const fingerprint=rendererFileName(component.apiName,asset);
  const path=`dist/component-library/components/${fingerprint}`;
  const {gzip,brotli}=compressRenderer(asset);
  await Promise.all([
    writeFile(path,asset),writeFile(path+'.gz',gzip),writeFile(path+'.br',brotli),
    // Compatibility for older clients; never given immutable cache headers.
    writeFile(`dist/component-library/components/${component.apiName}.json`,asset)
  ]);
  index.push({
    assetPath:'component-library/components/'+fingerprint,
    apiName: component.apiName,
    label: component.label,
    description: component.description ?? '',
    category: component.category ?? '',
    surfaces: component.surfaces,
    resize: component.resize,
    version: component.version,
    propertyDefinitions: appOwned ? [] : (component.propertyDefinitions ?? []),
    eventDefinitions: component.eventDefinitions ?? [],
    scope: component.scope === 'platform-system' ? 'platform-system' : undefined
  });
}
await writeFile('dist/component-library/catalog-index.json',JSON.stringify({
  schemaVersion:catalog.schemaVersion, components:index
}));
await writeFile('dist/component-library/catalog.json', JSON.stringify({ ...catalog, components }));
console.log(`Bundled ${components.length} component definitions with lazy renderer assets.`);
