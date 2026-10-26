import {UneTable as Primitive} from "../une/shared/UneData.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneTable(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Table")}/></UneFrame>}
