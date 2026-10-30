import {UneCard as Primitive} from "../ui-runtime/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiCard(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Card")}/></UneFrame>}
