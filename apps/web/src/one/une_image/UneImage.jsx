import OneTenantImage from "../shared/OneTenantImage.jsx";
import {evaluateFieldExpression} from "../shared/OneFieldExpression.js";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
const numeric=(v,fallback,max=1200)=>Number.isFinite(Number(v))&&Number(v)>=0?Math.min(Number(v),max):fallback;
const display=(expr,row)=>typeof expr==='string'&&expr.trim()&&(/@[A-Za-z]/.test(expr)||/\s[&+*/]\s/.test(expr)||/^\s*"/.test(expr))
 ? evaluateFieldExpression(expr,row??{}):typeof expr==='string'?expr:'';
/** Image is ONE configurable card (image, heading/text and optional badge).
 * A headerBoxHeight of zero hides the text area; badgeVisible=false hides its
 * badge; both together produce a plain image with no reserved header space.
 */
export default function UneImage(props){
 const p=uneProps(props,"Image");
 const record=p.record&&typeof p.record==='object'&&!Array.isArray(p.record)?p.record:
   Array.isArray(p.records)?p.records[0]:Array.isArray(p.items)?p.items[0]:{};
 const source=display(props.imageSource,record)||p.src||'';
 const header=props.textSource!==undefined?display(props.textSource,record):String(p.caption??p.title??'');
 const badge=props.badgeText!==undefined?display(props.badgeText,record):String(p.badge??'');
 const badgeEnabled=props.badgeVisible===true&&Boolean(badge);
 const headingHeight=numeric(props.headerBoxHeight,header?44:0);
 const imageHeight=numeric(props.imageHeight,220);
 const placement=['top','bottom','left','right'].includes(props.imagePlacement)?props.imagePlacement:'top';
 const badgePlace=String(props.badgeAlignment||'image-top-right');
 const onImage=badgePlace.startsWith('image-')&&Boolean(source);
 const badgeNode=badgeEnabled?<span className="une-image-card-badge" style={{
   fontSize:numeric(props.badgeTextSize,12,60),
   fontWeight:props.badgeBold!==false?700:400,
   color:props.badgeTextColor||'#fff',
   ...(onImage?{position:'absolute',zIndex:2,top:badgePlace.includes('bottom')?undefined:8,
     bottom:badgePlace.includes('bottom')?8:undefined,
     left:badgePlace.includes('left')?8:badgePlace.includes('center')?'50%':undefined,
     right:badgePlace.includes('right')?8:undefined,
     transform:badgePlace.includes('center')?'translateX(-50%)':undefined}:{})
 }}>{badge}</span>:null;
 const imageNode=<div className="une-image-card-picture" style={{position:'relative',minWidth:0,
   order:placement==='bottom'||placement==='right'?2:0,flex:placement==='left'||placement==='right'?'1 1 50%':undefined}}>
    {source&&<OneTenantImage src={source} loadAsset={p.loadAsset} alt={p.alt||header||''}
      style={{display:'block',width:'100%',height:imageHeight,objectFit:props.imageFill==='fit'?'contain':props.imageFill==='stretch'?'fill':props.imageFill==='fill'?'cover':p.imageFit||'cover',
        borderRadius:numeric(p.radius,12,80),border:props.imageBorderColor?'1px solid '+props.imageBorderColor:undefined}}/>}
    {onImage&&badgeNode}
  </div>;
 const headerNode=headingHeight>0&&header?<div className="une-image-card-header" style={{
   order:1,boxSizing:'border-box',height:headingHeight,minWidth:0,overflow:'hidden',
   display:'flex',alignItems:'center',justifyContent:props.headerAlignment==='right'?'flex-end':props.headerAlignment==='center'?'center':'flex-start',
   fontWeight:props.headerBold!==false?700:400,
   whiteSpace:props.wrapText===false?'nowrap':'normal',overflowWrap:'anywhere',
   border:props.headerBorderColor?'1px solid '+props.headerBorderColor:undefined
 }}>{header}</div>:null;
 return <UneFrame p={props}><figure className="une-image-card" style={{
   margin:0,display:'flex',position:'relative',minWidth:0,
   flexDirection:placement==='left'||placement==='right'?'row':'column',gap:0
 }}>
   {imageNode}{headerNode}
   {!onImage&&badgeNode}
 </figure></UneFrame>;
}
