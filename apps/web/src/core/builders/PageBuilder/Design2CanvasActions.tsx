import {
 AlignHorizontalJustifyStart,AlignHorizontalJustifyCenter,AlignHorizontalJustifyEnd,
 AlignVerticalJustifyStart,AlignVerticalJustifyCenter,AlignVerticalJustifyEnd,
 ArrowLeftRight,ArrowUpDown,Layers3,ArrowDown,Group,Ungroup,Lock,Unlock,Boxes
} from 'lucide-react';
import type {ArrangeRibbonProps} from './ArrangeRibbon';

type Props=ArrangeRibbonProps&{area:string};

/** Row 0 C7-C20: fixed, always-present canvas commands.
 * The Arrange ribbon's existing Page Builder callbacks remain the single
 * implementation of every operation. Only the Body area enables actions.
 * A command that cannot apply to the current selection stays visible/disabled.
 */
export default function Design2CanvasActions(props:Props){
 const body=props.area==='Body';
 const movable=body&&props.freeCanvas&&props.hasSelection&&!props.locked;
 const hasThree=movable&&props.selectedCount>=3;
 const actions=[
  {label:'Align left',Icon:AlignHorizontalJustifyStart,enabled:movable,
   action:()=>props.onAlign('x','start')},
  {label:'Align centre',Icon:AlignHorizontalJustifyCenter,enabled:movable,
   action:()=>props.onAlign('x','center')},
  {label:'Align right',Icon:AlignHorizontalJustifyEnd,enabled:movable,
   action:()=>props.onAlign('x','end')},
  {label:'Align top',Icon:AlignVerticalJustifyStart,enabled:movable,
   action:()=>props.onAlign('y','start')},
  {label:'Align middle',Icon:AlignVerticalJustifyCenter,enabled:movable,
   action:()=>props.onAlign('y','center')},
  {label:'Align bottom',Icon:AlignVerticalJustifyEnd,enabled:movable,
   action:()=>props.onAlign('y','end')},
  {label:'Distribute horizontally',Icon:ArrowLeftRight,enabled:hasThree,
   action:()=>props.onDistribute('x')},
  {label:'Distribute vertically',Icon:ArrowUpDown,enabled:hasThree,
   action:()=>props.onDistribute('y')},
  {label:'Bring to front',Icon:Layers3,enabled:movable&&props.canBringToFront,
   action:()=>props.onPlace('front')},
  {label:'Send backward',Icon:ArrowDown,enabled:movable&&props.canSendBackward,
   action:()=>props.onMove(-1)},
  {label:'Group',Icon:Group,enabled:movable&&props.canGroup,
   action:props.onGroup},
  {label:'Ungroup',Icon:Ungroup,enabled:movable&&props.canUngroup,
   action:props.onUngroup},
  {label:props.locked?'Unlock component':'Lock / Unlock component',Icon:props.locked?Unlock:Lock,
   enabled:body&&props.freeCanvas&&props.hasSelection,action:props.onLock},
  {label:'Component nesting',Icon:Boxes,enabled:body&&props.hasSelection,
   action:props.onNesting}
 ];
 return <div className="smart-design2-arrange-actions"
   role="group" aria-label="Design 2 canvas actions" data-design-columns="7-20">
   {actions.map((item,index)=><button key={index} type="button"
     className="smart-design2-arrange-action"
     data-design-row="0" data-design-column={index+7}
     data-supported={item.enabled?'true':'false'}
     title={item.label} aria-label={item.label}
     aria-pressed={index===12?props.locked:undefined}
     disabled={!item.enabled} onClick={item.action}>
     <item.Icon size={16} aria-hidden="true"/>
   </button>)}
 </div>;
}
