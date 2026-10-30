import {UneForm as Primitive} from "../ui-runtime/shared/Data.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiForm(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Form")}/></UneFrame>}
