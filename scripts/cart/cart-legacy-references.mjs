/**
 * Retire the legacy CartSession object without selecting a random Cart when a
 * browser session owns multiple carts. This module has no DB side effects.
 */
export const hasLegacyCartReference = value =>
  typeof value === 'string' && /CartSession|cartSessionId|activeCartSessionId/.test(value);

/** Transform an expression or a literal API-name field, not a SQL statement. */
export function rewriteLegacyCartText(text,{page=false}={}){
 if(typeof text !== 'string')return text;
 let result=text
  // A single-record lookup by browser session is ambiguous with several carts.
  .replace(/\bGETRECORD\s*\(\s*(['"]?)CartSession\1\s*,\s*(['"]?)SessionKey\2\s*,\s*\$session(?:\.id)?(?=\s*,)/gi,
    'GETRECORD(Cart, Id, $session.cartId')
  .replace(/\bGETRECORD\s*\(\s*(['"]?)Cart\1\s*,\s*(['"]?)SessionKey\2\s*,\s*\$session(?:\.id)?(?=\s*,)/gi,
    'GETRECORD(Cart, Id, $session.cartId')
  .replace(/\$state\.cartSessionId\b/g,'$state.activeCartId')
  .replace(/\$session\.cartSessionId\b/g,'$session.cartId')
  .replace(/\bactiveCartSessionId\b/g,'activeCartId')
  .replace(/\bCartLine\.CartSession\b/g,'CartLine.Cart')
  .replace(/\bCartSession\b/g,'Cart')
  .replace(/\bCartSessionId\b/g,'CartId')
  .replace(/\bcartSessionId\b/g,page?'activeCartId':'cartId');
 return result;
}

/** Fully migrate nested published page/Flow metadata, including saved formulas. */
export function rewriteLegacyCartTree(input,{page=false}={}){
 if(typeof input==='string')return rewriteLegacyCartText(input,{page});
 if(Array.isArray(input))return input.map(v=>rewriteLegacyCartTree(v,{page}));
 if(!input||typeof input!=='object')return input;
 const result={};
 for(const [key,value] of Object.entries(input)){
  const nextKey=rewriteLegacyCartText(key,{page});
  if(Object.hasOwn(result,nextKey))throw Error('Legacy Cart key collides with existing key: '+nextKey);
  result[nextKey]=rewriteLegacyCartTree(value,{page});
 }
 return result;
}

/** Preserve a tenant's custom Flow graph; change the parent/link and no other logic. */
export function rewriteLegacyCartFlow(graph){
 if(!graph||typeof graph!=='object'||Array.isArray(graph))throw Error('Invalid Flow graph');
 const changed=JSON.stringify(graph)!==JSON.stringify(rewriteLegacyCartTree(graph));
 if(!changed)return {graph,changed:false};
 const migrated=rewriteLegacyCartTree(graph);
 const nodes=Array.isArray(migrated.elements)?migrated.elements:[];
 let needsCartInput=false;
 for(const node of nodes){
  if(!node||typeof node!=='object'||!node.config)continue;
  const cfg=node.config;
  const old=graph.elements?.find?.(x=>x?.id===node.id);
  const fromSession=old?.config?.object==='CartSession';
  if(node.type==='Get Records'&&fromSession&&cfg.recordLimit!=='all'&&Array.isArray(cfg.conditions)){
   for(const condition of cfg.conditions){
    if(condition.field==='SessionKey' &&
      /^(?:\{!sessionKey\}|\$session(?:\.id)?)$/.test(String(condition.value))){
     condition.field='Id';condition.value='{!cartId}';needsCartInput=true;
    }
   }
   if(cfg.conditions.some(c=>c.field==='Id'&&c.value==='{!cartId}') &&
      !cfg.conditions.some(c=>c.field==='UserId')){
    cfg.conditions.push({field:'UserId',operator:'Equals',value:'{!$User.Id}'});
   }
  }
  if(node.type==='Create Records'&&fromSession&&cfg.object==='Cart'
      &&Array.isArray(cfg.fieldValues)&&
      !cfg.fieldValues.some(f=>f.field==='UserId')){
   cfg.fieldValues.push({field:'UserId',value:'{!$User.Id}'});
  }
 }
 if(needsCartInput){
  if(!Array.isArray(migrated.resources))throw Error('Legacy Cart Flow lacks resource definitions');
  let selected=migrated.resources.find(r=>r.name==='cartId');
  if(!selected){
   selected={name:'cartId',type:'Variable',dataType:'Text',availableForInput:true,availableForOutput:true};
   migrated.resources.push(selected);
  }else selected.availableForInput=true;
 }
 if(hasLegacyCartReference(JSON.stringify(migrated)))
  throw Error('Legacy CartSession Flow reference remains after conversion');
 return {graph:migrated,changed:true};
}

/** Convert all user-authored component formulas, bindings and Cart grids. */
export function rewriteLegacyCartPage(page){
 if(!page||typeof page!=='object'||Array.isArray(page))throw Error('Invalid Page metadata');
 const rewritten=rewriteLegacyCartTree(page,{page:true});
 const components=rewritten.components;
 if(Array.isArray(components)){
  for(const c of components){
   const p=c?.properties;
   if(!p||typeof p!=='object')continue;
   if(p.relatedFilterKey==='activeCartId'&&p.relatedFieldApiName==='Cart')
    p.autoRecordScope=false; // never fall back to SessionKey when several Carts exist
   if(p.actionFlows&&typeof p.actionFlows==='object'){
    for(const action of Object.values(p.actionFlows)){
     if(!action||typeof action!=='object')continue;
     if(action.inputs&&typeof action.inputs==='object'&&Object.hasOwn(action.inputs,'activeCartId')){
      action.inputs.cartId='$session.cartId';
      delete action.inputs.activeCartId;
     }
     if(action.outputs&&typeof action.outputs==='object'&&Object.hasOwn(action.outputs,'activeCartId')){
      action.outputs.cartId='activeCartId';
      delete action.outputs.activeCartId;
     }
    }
   }
  }
 }
 if(hasLegacyCartReference(JSON.stringify(rewritten)))
  throw Error('Legacy CartSession Page reference remains after conversion');
 return {page:rewritten,changed:JSON.stringify(page)!==JSON.stringify(rewritten)};
}
