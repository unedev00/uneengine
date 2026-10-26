import {UneMetric as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneMetric(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Metric")}/></UneFrame>}
