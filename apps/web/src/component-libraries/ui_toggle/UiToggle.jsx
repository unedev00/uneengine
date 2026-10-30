import {UneToggle as Primitive} from "../ui-runtime/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiToggle(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Toggle")}/></UneFrame>}
