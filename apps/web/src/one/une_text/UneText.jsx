import OneComponent from "../OneText/OneText.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneText(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"Text")}/></UneFrame>}
