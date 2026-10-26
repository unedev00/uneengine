import {UneDatePicker as Primitive} from "../une/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneDatePicker(props){return <UneFrame p={props}><Primitive {...uneProps(props,"DatePicker")}/></UneFrame>}
