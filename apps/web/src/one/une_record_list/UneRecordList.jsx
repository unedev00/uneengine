import {UneRecordList as Primitive} from "../une/shared/UneData.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneRecordList(props){return <UneFrame p={props}><Primitive {...uneProps(props,"RecordList")}/></UneFrame>}
