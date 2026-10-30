import OneComponent from "../shared/primitives/ItemGrid/ItemGrid.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiItemGrid(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"ItemGrid")}/></UneFrame>}
