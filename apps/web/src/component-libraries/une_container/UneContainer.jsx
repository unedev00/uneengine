import {UneContainer as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneContainer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Container")}/></UneFrame>}
