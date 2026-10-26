import {UneModal as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneModal(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Modal")}/></UneFrame>}
