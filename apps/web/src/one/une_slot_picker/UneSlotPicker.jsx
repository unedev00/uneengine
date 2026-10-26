import {UneSlotPicker as Primitive} from "../une/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneSlotPicker(props){return <UneFrame p={props}><Primitive {...uneProps(props,"SlotPicker")}/></UneFrame>}
