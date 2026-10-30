import {UneSplitPane as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneSplitPane(props){return <UneFrame p={props}><Primitive {...uneProps(props,"SplitPane")}/></UneFrame>}
