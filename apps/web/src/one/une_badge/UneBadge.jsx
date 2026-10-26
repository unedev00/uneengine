import OneComponent from "../OneBadge/OneBadge.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneBadge(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"Badge")}/></UneFrame>}
