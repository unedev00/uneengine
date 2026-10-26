import OneComponent from "../OneButton/OneButton.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneButton(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"Button")}/></UneFrame>}
