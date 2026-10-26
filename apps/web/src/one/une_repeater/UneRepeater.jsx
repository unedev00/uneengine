import {UneRepeater as Primitive} from "../une/shared/UneData.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneRepeater(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Repeater")}/></UneFrame>}
