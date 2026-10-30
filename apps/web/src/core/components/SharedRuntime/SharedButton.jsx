import {useOneActions, fire} from "../../../component-libraries/shared/Actions.jsx";
export default function SharedButton(props) {
  const p={...props,kind:props.kind||"Button"};
  const {root}=useOneActions(p);
  const label=typeof p.label==="string"?p.label.trim():"";
  // A published button without a configured Flow/navigation action must not look actionable.
  const configured=typeof p.onClick==="function"
    || (typeof p.onAction==="function" && Boolean(p.actionFlows?.click));
  const hoverConfigured=typeof p.onAction==="function" && Boolean(p.actionFlows?.hover);
  // In the design canvas the control should look like the published design.
  // The canvas blocks interactions and selects the component instead.
  const disabled=p.disabled===true||p.loading===true||(!configured&&!hoverConfigured&&p.builderPreview!==true);
  const visibleLabel=label||(p.builderPreview===true?"Continue":"");
  if (!visibleLabel) return null;
  return <div {...root}><button type="button"
    className={"one-btn one-btn--"+(p.variant||"primary")}
    disabled={disabled} aria-busy={p.loading===true?"true":undefined}
    title={!configured?"Configure a click action in Page Builder":undefined}
    onClick={()=>typeof p.onClick==="function"?p.onClick(p.value??true):fire(p,"click",p.value??true)}
  >{p.loading?"Working…":visibleLabel}</button></div>;
}
