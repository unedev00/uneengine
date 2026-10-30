import {UneContainer as Primitive} from "../ui-runtime/shared/Layout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiContainer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Container")}/></UneFrame>}
