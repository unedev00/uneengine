import {UneTabs as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneAceChatterTabs(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Tabs")}/></UneFrame>}
