import {UneStack as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneStack(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Stack")}/></UneFrame>}
