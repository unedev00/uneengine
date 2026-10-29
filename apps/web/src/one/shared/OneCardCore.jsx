import OneTenantImage from "./OneTenantImage.jsx";

/** One shared image, header and badge card visual for both UNE Image and
 * UNE Card Grid. The parent supplies the number of cards and action behaviour;
 * both use identical source, placement and visibility semantics. */
const imageUrl=value=>typeof value==="string"&&(/^(https:\/\/|asset:[0-9a-f-]{36}$)/i.test(value));
const placeBadge=(placement,showImage)=>{
 const p=String(placement||"image-top-right"),attached=p.startsWith("image-")&&showImage;
 if(!attached)return {};
 return {
   position:"absolute",zIndex:3,
   top:p.includes("bottom")?undefined:8,
   bottom:p.includes("bottom")?8:undefined,
   left:p.includes("left")?8:p.includes("center")?"50%":undefined,
   right:p.includes("right")?8:undefined,
   transform:p.includes("center")?"translateX(-50%)":undefined
 };
};
const safeNum=(value,fallback,min,max)=>Number.isFinite(Number(value))?
 Math.min(max,Math.max(min,Number(value))):fallback;
export default function OneCardCore({source,header,badge,props:p={},loadAsset,
 imageStyle={},headerStyle={},badgeStyle={},missingImageBehavior="none",designer=false,
 imageClassName="md-product-image",headerClassName="md-product-name",badgeClassName="md-product-badge"}){
 const showImage=p.showImage!==false;
 const valid=showImage&&imageUrl(source);
 const showHeader=p.headerBoxHeight===undefined||safeNum(p.headerBoxHeight,0,0,1200)>0;
 const badgeEnabled=p.badgeVisible===undefined?Boolean(badge):p.badgeVisible===true&&(Boolean(badge)||designer);
 const placement=["top","left","right","bottom"].includes(p.imagePlacement)?p.imagePlacement:"top";
 const imageOrder=placement==="bottom"||placement==="right"?2:0;
 const fit=p.imageFill==="fit"?"contain":p.imageFill==="stretch"?"fill":p.imageFill==="fill"?"cover":p.imageFit||"cover";
 const resolvedImageStyle={display:"block",width:"100%",objectFit:fit,order:imageOrder,
    ...(p.imageHeight!==undefined?{height:safeNum(p.imageHeight,220,0,1200)}:{}),
    ...(p.imageBorderColor?{border:"1px solid "+p.imageBorderColor}:{}),
    ...imageStyle};
 const imageNode=valid
   ?<OneTenantImage loading="lazy" src={source} alt={header||""}
      loadAsset={loadAsset} className={imageClassName} style={resolvedImageStyle}/>
   :showImage&&(designer||missingImageBehavior==="placeholder")
     ?<div className={imageClassName+" une-card-image-placeholder"} style={{
       ...resolvedImageStyle,minHeight:Math.max(64,safeNum(p.imageHeight,150,0,1200)),
       display:"flex",alignItems:"center",justifyContent:"center",
       background:"var(--une-card-placeholder,#edf2f7)",color:"#64748b"
     }} role="img" aria-label="Image area">Image area</div>:null;
 const computedHeaderStyle={
   ...headerStyle,order:1,
   ...(p.headerBoxHeight!==undefined?{height:safeNum(p.headerBoxHeight,0,0,1200),overflow:"hidden"}:{}),
   ...(p.headerBorderColor?{border:"1px solid "+p.headerBorderColor}:{}),
   ...(p.headerAlignment?{textAlign:p.headerAlignment}:{}),
   ...(p.headerBold!==undefined?{fontWeight:p.headerBold?700:400}:{}),
   ...(p.wrapText===false?{whiteSpace:"nowrap"}:{})
 };
 const badgeNode=badgeEnabled?<span className={badgeClassName} style={{
   display:"inline-block",padding:"3px 8px",borderRadius:999,
   background:p.badgeBackgroundColor||p.accentColor||"#2563eb",
   color:p.badgeTextColor||"#fff",
   fontWeight:p.badgeBold===false?400:700,
   fontSize:safeNum(p.badgeTextSize,12,0,60),
   ...placeBadge(p.badgeAlignment,Boolean(imageNode)),
   ...badgeStyle
 }}>{String(badge||'Badge').slice(0,120)}</span>:null;
 return <>
  {imageNode}
  {badgeNode}
  {showHeader&&p.showTitle!==false&&(Boolean(header)||designer)&&
    <strong className={headerClassName} style={computedHeaderStyle}>{header||'Header / text'}</strong>}
 </>;
}
