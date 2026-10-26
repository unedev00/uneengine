import {UneImage as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneImage(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Image")}/></UneFrame>}
