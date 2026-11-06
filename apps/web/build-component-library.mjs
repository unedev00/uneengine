import { mkdir, writeFile } from 'node:fs/promises';
import { rendererFileName, compressRenderer } from './component-delivery.mjs';
import { loadComponentCatalog, buildBundledComponent } from '../../scripts/component-catalog.mjs';

const catalog = await loadComponentCatalog();
const components = [];
const index = [];
await mkdir('dist/component-library/components', { recursive: true });
for (const component of catalog.components) {
  const built = { ...component, ...await buildBundledComponent(component) };
  const appOwned=component.apiName.startsWith('ui_');
  const defaultProps=appOwned?Object.fromEntries((component.propertyDefinitions??[])
    .filter(def=>Object.prototype.hasOwnProperty.call(def,'defaultValue'))
    .map(def=>[def.propertyKey,def.defaultValue])):{};
  // The compiled component stays usable, but SQL/public indexes never receive
  // UNE property definitions. App-owned defaults ship with the renderer asset.
  components.push(appOwned?{...built,propertyDefinitions:[]}:built);
  const asset=JSON.stringify({
    apiName:component.apiName,version:component.version,compiledJs:built.compiledJs,
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
