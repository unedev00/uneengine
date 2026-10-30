import {UneToggle as Primitive} from "../ui-runtime/shared/Inputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiToggle(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Toggle")}/></UneFrame>}
