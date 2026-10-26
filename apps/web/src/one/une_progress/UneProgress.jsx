import {UneProgress as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneProgress(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Progress")}/></UneFrame>}
