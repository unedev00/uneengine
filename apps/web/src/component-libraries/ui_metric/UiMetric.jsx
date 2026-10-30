import {UneMetric as Primitive} from "../ui-runtime/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiMetric(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Metric")}/></UneFrame>}
