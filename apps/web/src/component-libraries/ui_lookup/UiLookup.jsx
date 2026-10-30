import {UneLookup as Primitive} from "../ui-runtime/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiLookup(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Lookup")}/></UneFrame>}
