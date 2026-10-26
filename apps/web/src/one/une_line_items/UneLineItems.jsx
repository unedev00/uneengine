import {UneLineItems as Primitive} from "../une/shared/UneData.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneLineItems(props){return <UneFrame p={props}><Primitive {...uneProps(props,"LineItems")}/></UneFrame>}
