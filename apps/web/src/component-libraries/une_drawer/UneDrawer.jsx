import {UneDrawer as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneDrawer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Drawer")}/></UneFrame>}
