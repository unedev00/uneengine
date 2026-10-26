export function resolveAssistTabs(
  app: {navigationItems?:string[];navigationOrder?:Array<{type:string;apiName:string}>}|null,
  objects: Array<{apiName:string;label?:string;pluralLabel?:string}>
):Array<{object:string;label:string}>;
