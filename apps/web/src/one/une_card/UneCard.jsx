import {UneCard as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneCard(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Card")}/></UneFrame>}
