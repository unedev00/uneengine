import OneCardCore from "../shared/CardCore.jsx";
import {evaluateFieldExpression} from "../shared/FieldExpression.js";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
const safe=(v,f)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):f;
// Text, badge and image Data formulas always resolve through the shared
// evaluator; no displayMode, Object selection or special source-mode switch.
const allowed=(p,key,row)=>typeof p.fieldAllowed==="function"
 ?p.fieldAllowed(key,row??{}):!p.dataFieldFilters||
   typeof p.dataFieldFilters!=="object"||
   !Object.prototype.hasOwnProperty.call(p.dataFieldFilters,key);
const display=(expr,row,p,key)=>typeof expr==="string"&&allowed(p,key,row)
 ?evaluateFieldExpression(expr,row??{},{readComponent:p.readComponent,
   pageState:p.pageState,sessionId:p.sessionId,
   rootObjectApiName:p.objectApiName,collectionSources:p.formulaCollectionSources,
   namedCollections:p.namedCollections}):"";
/** Image = exactly one instance of the Card visual used by Card Grid. */
export default function UiImage(props){
 const p=uneProps(props,"Image");
 const record=p.record&&typeof p.record==="object"&&!Array.isArray(p.record)?p.record:
   Array.isArray(p.records)?p.records[0]:Array.isArray(p.items)?p.items[0]:{};
 const source=allowed(props,'imageSource',record)
  ?(typeof props.imageSource==="string"&&record&&Object.prototype.hasOwnProperty.call(record,props.imageSource)
     ?String(record[props.imageSource]??""):display(props.imageSource,record,props,'imageSource')||
      (String(props.properties?.imageSource??props.imageSource??"").includes("$component.")?"":p.src||""))
  :"";
 const header=props.textSource!==undefined?display(props.textSource,record,props,'textSource'):String(p.caption??p.title??"");
 const badge=props.badgeText!==undefined?display(props.badgeText,record,props,'badgeText'):String(p.badge??"");
 React.useEffect(()=>{
  props.onFormulaDisplay?.({textSource:header,imageSource:source,badgeText:badge});
 },[props.onFormulaDisplay,header,source,badge]);
 const placement=["top","bottom","left","right"].includes(p.imagePlacement)?p.imagePlacement:"top";
 const design=props.previewOnly===true||props.builderPreview===true;
 const clickable=!design&&Boolean(props.actionFlows?.click)&&typeof props.onAction==="function";
 const activate=()=>{if(clickable)void Promise.resolve(props.onAction({
   event:"click",value:{record,source,header,badge}
 })).catch(()=>{});};
 return <UneFrame p={props}><figure className="une-image-card" data-image-placement={placement} style={{
   margin:0,display:"flex",position:"relative",minWidth:0,
   // The picture, empty placeholder, header and badges share ONE rounded clip.
   // A square figure overflow box otherwise cuts across the native image corners.
   borderRadius:safe(p.radius,12),overflow:"hidden",
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
       height:placement==="left"||placement==="right"?undefined:safe(p.headerBoxHeight,header?44:0)
     }}
   />
 </figure></UneFrame>;
}
