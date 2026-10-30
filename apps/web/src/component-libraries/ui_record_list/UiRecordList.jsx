import {UneRecordList as Primitive} from "../ui-runtime/shared/Data.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiRecordList(props){return <UneFrame p={props}><Primitive {...uneProps(props,"RecordList")}/></UneFrame>}
