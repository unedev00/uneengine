import {UneRecordList as Primitive} from "../ui-runtime/shared/UneData.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiRecordList(props){return <UneFrame p={props}><Primitive {...uneProps(props,"RecordList")}/></UneFrame>}
