import {UneForm as Primitive} from "../une/shared/UneData.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneForm(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Form")}/></UneFrame>}
