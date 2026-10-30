import {UneMenu as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneMenu(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Menu")}/></UneFrame>}
