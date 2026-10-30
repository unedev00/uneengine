import {UneDrawer as Primitive} from "../ui-runtime/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiDrawer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Drawer")}/></UneFrame>}
