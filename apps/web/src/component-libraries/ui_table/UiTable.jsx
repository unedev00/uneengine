import {UneTable as Primitive} from "../ui-runtime/shared/Data.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiTable(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Table")}/></UneFrame>}
