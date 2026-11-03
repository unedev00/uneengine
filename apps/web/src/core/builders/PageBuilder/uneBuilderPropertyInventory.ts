/** Types only. Global shared property definitions and enablement are read from
 * SQL via /api/metadata/builder-ribbon. Never duplicate the inventory in TS.
 */
export type UneBuilderTab='Data'|'Design'|'Design2'|'Shapes'|'Layout';
export type RibbonTab=UneBuilderTab|'Home';
export type RibbonControlKind='color'|'shadow'|'expression'|'align'|'number'|'position'|
 'boolean'|'choice'|'object'|'weekdays'|'command'|'readonly';
export type UneBuilderApi=string;
export type UneRibbonProperty={
 id:string;label:string;tab:RibbonTab;group:string;
 /** SQL-owned visual placement for the compact three-row Design and Shapes toolbars. */
 designRow?:number;designWidth?:number;designHeight?:number;designOrder?:number;
 designCaption?:string;designCaptionWidth?:number;designDisplay?:'buttons'|'dropdown';
 design2SlotKey?:string;
 kind:RibbonControlKind;components:readonly string[];
 default?:string|number|boolean|readonly string[];
 min?:number;max?:number;choices?:readonly string[];field?:boolean;
 /** Conditional editability supplied by the shared SQL property contract. */
 enabledWhen?:{property:string;in:readonly string[]};
 kindOverrides?:Record<string,RibbonControlKind>;
 defaultsOverrides?:Record<string,string|number|boolean>;
 choicesOverrides?:Record<string,readonly string[]>;
 valueKeys?:Record<string,string>;
};
export type Design2Slot={
 componentApi:string;area:string;areaOrder:number;slotKey:string;row:number;order:number;
 width:number;height:number;propertyKey:string|null;fallbackKey:string;
};
export type SharedRibbonCatalog={
 components:string[];
 properties:UneRibbonProperty[];
 design2Slots?:Design2Slot[];
};
export const sharedPropertyGroups=(properties:readonly UneRibbonProperty[],tab:UneBuilderTab)=>
 [...new Set(properties.filter(p=>p.tab===tab).map(p=>p.group))];
export const isUneBuilderApi=(api:string,components:readonly string[])=>
 components.includes(api);
export const uneBuilderDefaults=(api:string,properties:readonly UneRibbonProperty[]):Record<string,unknown>=>
 Object.fromEntries(properties.filter(p=>p.components.includes(api)&&
   (p.defaultsOverrides?.[api]??p.default)!==undefined)
   .map(p=>[p.valueKeys?.[api]??p.id,p.defaultsOverrides?.[api]??p.default]));
