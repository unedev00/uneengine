import type {ReactNode} from 'react';

/** Design 2 only. Original Design colour and typography artwork is unchanged. */
export function ShapeFillGlyph(){
 return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none"
   stroke="#173958" strokeWidth="1.8" strokeLinejoin="round">
   <circle cx="8.7" cy="8.2" r="6.3" fill="#fff"/>
   <rect x="8" y="8" width="12.5" height="12.5" rx="2.5" fill="#9bc7fa"/>
 </svg>;
}
export function FocusFillGlyph(){
 return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none"
   stroke="#1873ca" strokeWidth="1.8" strokeLinecap="round">
   <path d="M2 8V5a3 3 0 0 1 3-3h3m8 0h3a3 3 0 0 1 3 3v3M22 16v3a3 3 0 0 1-3 3h-3M8 22H5a3 3 0 0 1-3-3v-3"/>
   <rect x="6" y="6" width="12" height="12" rx="3" fill="#b9d9ff" stroke="none"/>
 </svg>;
}
export type PlacementChoice='top'|'middle'|'bottom'|'left'|'center'|'right';
/** 6 alignment pictograms from the approved reference; usable independently
 * by top/bottom/left/right image placement and other alignment properties. */
export function PlacementGlyph({value}:{value:PlacementChoice}){
 const bar=(x:number,y:number,w:number,h:number)=><rect x={x} y={y} width={w} height={h} rx="1"/>;
 const horizontal=value==='top'||value==='middle'||value==='bottom';
 const y=value==='top'?2:value==='middle'?11:20;
 const x=value==='left'?2:value==='center'?11:20;
 return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor">
  {horizontal?<>{bar(2,y,20,2)}{bar(6,value==='top'?5:value==='bottom'?6:4,5,value==='middle'?16:13)}
    {bar(13,value==='top'?5:value==='bottom'?10:7,5,value==='middle'?12:9)}</>
   :<>{bar(x,2,2,20)}{bar(value==='left'?5:value==='right'?5:4,5,value==='center'?6:13,5,5)}
    {bar(value==='left'?5:value==='right'?9:13,12,value==='center'?12:9,5)}</>}
 </svg>;
}
export type ImageFitChoice='center'|'fill'|'fit'|'stretch';
export function ImageFillGlyph({value}:{value:ImageFitChoice}){
 return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
  <rect x="2" y="3" width="20" height="18" rx="2" stroke="#476486" strokeWidth="1.4"/>
  <path d="M4 18 9 11l3.5 4 3-3L21 19H4Z" fill="#153a5d"/>
  <circle cx="17" cy="8" r="2" fill="#84b7eb"/>
  {value==='fit'&&<rect x="4" y="6" width="16" height="12" rx="1" stroke="#9cb9d8" strokeDasharray="2 2"/>}
  {value==='stretch'&&<path d="M3 4 8 9M21 4l-5 5M3 20l5-5M21 20l-5-5" stroke="#1971c7" strokeWidth="1.2"/>}
  {value==='center'&&<circle cx="12" cy="12" r="3" stroke="#1971c7" strokeWidth="1.2"/>}
  {value==='fill'&&<rect x="3" y="16" width="18" height="4" fill="#4da8dc" opacity=".6"/>}
 </svg>;
}
export function OrientationGlyph({value}:{value:'horizontal'|'vertical'}){
 return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"
   fill="#1a456e">{value==='vertical'?<><rect x="5" y="2" width="14" height="5" rx="1"/><rect x="5" y="10" width="14" height="5" rx="1"/><rect x="5" y="18" width="14" height="4" rx="1"/></>
    :<><rect x="2" y="5" width="5" height="14" rx="1"/><rect x="10" y="5" width="5" height="14" rx="1"/><rect x="18" y="5" width="4" height="14" rx="1"/></>}</svg>;
}
export type Design2ChoiceKind='placement'|'imageFill'|'orientation';
export function choiceIcon(kind:Design2ChoiceKind,value:string):ReactNode{
 if(kind==='placement')return <PlacementGlyph value={(['top','middle','bottom','left','center','right'].includes(value)?value:'top') as PlacementChoice}/>;
 if(kind==='imageFill')return <ImageFillGlyph value={(['center','fill','fit','stretch'].includes(value)?value:'fill') as ImageFitChoice}/>;
 return <OrientationGlyph value={value==='vertical'?'vertical':'horizontal'}/>;
}
