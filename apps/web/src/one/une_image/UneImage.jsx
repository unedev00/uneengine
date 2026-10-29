import OneCardCore from "../shared/OneCardCore.jsx";
import {evaluateFieldExpression} from "../shared/OneFieldExpression.js";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
const safe=(v,f)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):f;
const display=(expr,row)=>typeof expr==="string"&&expr.trim()&&(/@[A-Za-z]/.test(expr)||/\s[&+*/]\s/.test(expr)||/^\s*"/.test(expr))
 ?evaluateFieldExpression(expr,row??{}):typeof expr==="string"?expr:"";
/** Image = exactly one instance of the Card visual used by Card Grid. */
export default function UneImage(props){
 const p=uneProps(props,"Image");
 const record=p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
   Array.isArray(p.records)?p.records[0]:Array.isArray(p.items)?p.items[0]:{};
 const source=display(props.imageSource,record)||p.src||"";
 const header=props.textSource!==undefined?display(props.textSource,record):String(p.caption??p.title??"");
 const badge=props.badgeText!==undefined?display(props.badgeText,record):String(p.badge??"");
 const placement=["top","bottom","left","right"].includes(p.imagePlacement)?p.imagePlacement:"top";
 const design=props.previewOnly===true||props.builderPreview===true;
 const clickable=!design&&Boolean(props.actionFlows?.click)&&typeof props.onAction==="function";
 const activate=()=>{if(clickable)void Promise.resolve(props.onAction({
   event:"click",value:{record,source,header,badge}
 })).catch(()=>{});};
 return <UneFrame p={props}><figure className="une-image-card" style={{
   margin:0,display:"flex",position:"relative",minWidth:0,
   flexDirection:placement==="left"||placement==="right"?"row":"column",gap:0
 }} role={clickable?"button":undefined} tabIndex={clickable?0:undefined}
    onClick={clickable?activate:undefined}
    onKeyDown={clickable?event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activate();}}:undefined}>
   <OneCardCore source={source} header={header} badge={badge} props={props}
     loadAsset={p.loadAsset} designer={design}
     imageClassName="une-image-card-picture"
     headerClassName="une-image-card-header"
     badgeClassName="une-image-card-badge"
     imageStyle={{height:safe(p.imageHeight,220),
       borderRadius:safe(p.radius,12),minWidth:0,
       flex:placement==="left"||placement==="right"?"1 1 50%":undefined}}
     headerStyle={{
       boxSizing:"border-box",minWidth:0,display:"flex",alignItems:"center",
       justifyContent:p.headerAlignment==="right"?"flex-end":p.headerAlignment==="center"?"center":"flex-start",
       overflowWrap:"anywhere",
       height:safe(p.headerBoxHeight,header?44:0)
     }}
   />
 </figure></UneFrame>;
}
