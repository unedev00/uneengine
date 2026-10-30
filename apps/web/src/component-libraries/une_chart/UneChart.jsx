import {UneChart as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneChart(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Chart")}/></UneFrame>}
