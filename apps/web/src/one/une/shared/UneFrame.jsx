import {evaluateFieldExpression} from "../../shared/OneFieldExpression.js";
const accents={blue:"#007aff",mint:"#00a98f",purple:"#8855e8",orange:"#ff8a00",neutral:"#64748b"};
const oneOf=(value,options,fallback)=>options.includes(value)?value:fallback;
const px=(value,fallback,max=160)=>Number.isFinite(Number(value))&&Number(value)>=0?Math.min(max,Number(value)):fallback;
export function uneProps(p,kind){
 const tone=oneOf(p.tone,Object.keys(accents),"blue");
 const result={...p,kind,theme:oneOf(p.theme,["light","dark"],"light"),accentColor:p.accentColor||accents[tone],
 radius:px(p.radius,20),padding:px(p.padding,16),gap:px(p.gap,12),glassBlur:px(p.glassBlur,12,40)};
 // Resolve only declared text slots with a valid record context. Keep legacy
 // literals untouched and never evaluate arbitrary code or numeric properties.
 const record=p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
   Array.isArray(p.records)&&p.records.length?p.records[0]:
   Array.isArray(p.items)&&p.items.length?p.items[0]:null;
 if(record){
  const textKeys=["text","label","title","subtitle","description","caption","placeholder","helpText","emptyText","submitLabel","openLabel","confirmLabel","searchPlaceholder","badge","value","message"];
  for(const key of textKeys){
   const raw=result[key];
   if(typeof raw==="string"&&/^\s*@(?:[A-Za-z][A-Za-z0-9_]*)(?:\s*&|\s*$)/.test(raw))
    result[key]=evaluateFieldExpression(raw,record);
  }
 }
 if(kind==="Calendar"&&Array.isArray(p.records)&&(p.dateFieldApiName||p.titleFieldApiName))
  result.records=p.records.map(item=>({...item,
   ...(p.dateFieldApiName?{date:item[p.dateFieldApiName]}:{}),
   ...(p.titleFieldApiName?{title:item[p.titleFieldApiName]}:{})}));
 return result;
}
const cssLength=(value,fallback)=>{if(value===undefined||value===null||value==='')return fallback;
 const raw=String(value).trim();
 return /^(auto|fit-content|min-content|max-content|[0-9]+(?:\.[0-9]+)?(?:px|rem|%|vw|vh))$/.test(raw)?raw:fallback;
};
export function UneFrame({p,children}){
 const theme=oneOf(p.theme,["light","dark"],"light"),
 surface=oneOf(p.surface,["glass","solid","plain"],"glass"),
 tone=oneOf(p.tone,Object.keys(accents),"blue"),
 shadow=oneOf(p.shadow,["none","small","medium","large"],"medium"),
 density=oneOf(p.density,["compact","comfortable","spacious"],"comfortable");
 const weight=Number(p.fontWeight);
 const family={system:'-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif',
  sans:'Inter,system-ui,sans-serif',serif:'Georgia,serif',mono:'ui-monospace,SFMono-Regular,monospace'};
 const style={
  "--une-accent":p.accentColor||accents[tone],
   "--une-blur":px(p.glassBlur,12,40)+"px","--one-radius":px(p.radius,20,80)+"px",
   ...(p.backgroundColor?{"--une-bg":p.backgroundColor}:{}),...(p.textColor?{"--une-fg":p.textColor}:{}),
   ...(p.borderColor?{"--une-border":p.borderColor}:{}),
   "--one-pad":px(p.padding,16,160)+"px","--one-gap":px(p.gap,12,120)+"px",
   ...(p.borderWidth!==undefined?{"--une-border-width":px(p.borderWidth,1,12)+"px"}:{}),
   fontFamily:family[p.fontFamily]||family.system,
   ...(p.fontSize!==undefined?{fontSize:px(p.fontSize,17,80)+"px"}:{}),
   ...(Number.isFinite(weight)&&weight>=100&&weight<=900?{fontWeight:weight}:{}),
   ...(Number.isFinite(Number(p.lineHeight))&&Number(p.lineHeight)>=1&&Number(p.lineHeight)<=3?{lineHeight:Number(p.lineHeight)}:{}),
   ...(Number.isFinite(Number(p.letterSpacing))&&Math.abs(Number(p.letterSpacing))<=15?{letterSpacing:Number(p.letterSpacing)+"px"}:{}),
   ...(p.textAlign&&["left","center","right"].includes(p.textAlign)?{textAlign:p.textAlign}:{}),
   width:cssLength(p.width,"100%"),height:cssLength(p.height,"auto"),
   minWidth:cssLength(p.minWidth,undefined),maxWidth:cssLength(p.maxWidth,undefined),
   minHeight:cssLength(p.minHeight,undefined),maxHeight:cssLength(p.maxHeight,undefined),
   ...(p.margin!==undefined?{margin:px(p.margin,0,160)+"px"}:{}),
   opacity:px(p.opacity,100,100)/100
  };
 return <div className="une-ui" data-une-theme={theme} data-une-surface={surface}
  data-une-density={density} data-une-shadow={shadow} data-une-hide-phone={p.hideOnPhone===true}
  data-une-hide-tablet={p.hideOnTablet===true} data-une-hide-desktop={p.hideOnDesktop===true}
  style={style}>{children}</div>;
}
