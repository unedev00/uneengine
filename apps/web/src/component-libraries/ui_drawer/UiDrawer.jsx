import {UneDrawer as Primitive} from "../ui-runtime/shared/Layout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiDrawer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Drawer")}/></UneFrame>}
