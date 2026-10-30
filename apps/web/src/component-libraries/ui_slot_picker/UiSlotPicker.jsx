import {UneSlotPicker as Primitive} from "../ui-runtime/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiSlotPicker(props){return <UneFrame p={props}><Primitive {...uneProps(props,"SlotPicker")}/></UneFrame>}
