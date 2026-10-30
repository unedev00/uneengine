import {UneSlotPicker as Primitive} from "../ui-runtime/shared/Inputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiSlotPicker(props){return <UneFrame p={props}><Primitive {...uneProps(props,"SlotPicker")}/></UneFrame>}
