import {UneAlert as Primitive} from "../ui-runtime/shared/Display.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiAlert(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Alert")}/></UneFrame>}
