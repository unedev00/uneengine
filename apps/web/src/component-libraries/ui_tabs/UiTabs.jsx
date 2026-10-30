import {UneTabs as Primitive} from "../ui-runtime/shared/Layout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiTabs(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Tabs")}/></UneFrame>}
