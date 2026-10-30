import {UneChoice as Primitive} from "../une/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneChoice(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Choice")}/></UneFrame>}
