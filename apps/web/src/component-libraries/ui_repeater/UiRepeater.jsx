import {UneRepeater as Primitive} from "../ui-runtime/shared/UneData.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiRepeater(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Repeater")}/></UneFrame>}
