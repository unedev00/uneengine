import {UneGrid as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneGrid(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Grid")}/></UneFrame>}
