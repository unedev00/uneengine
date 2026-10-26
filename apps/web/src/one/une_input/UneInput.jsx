import {UneInput as Primitive} from "../une/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneInput(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Input")}/></UneFrame>}
