import OneComponent from "../OneItemGrid/OneItemGrid.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneItemGrid(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"ItemGrid")}/></UneFrame>}
