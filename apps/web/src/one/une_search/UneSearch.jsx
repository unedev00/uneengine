import OneComponent from "../OneSearch/OneSearch.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneSearch(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"Search")}/></UneFrame>}
