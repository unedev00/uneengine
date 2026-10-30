import {UneRepeater as Primitive} from "../ui-runtime/shared/Data.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiRepeater(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Repeater")}/></UneFrame>}
