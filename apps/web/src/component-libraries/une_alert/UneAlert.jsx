import {UneAlert as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneAlert(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Alert")}/></UneFrame>}
