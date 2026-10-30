import {UneNavigation as Primitive} from "../une/shared/UneLayout.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneNavigation(props){return <UneFrame p={props}><Primitive {...uneProps(props,"Navigation")}/></UneFrame>}
