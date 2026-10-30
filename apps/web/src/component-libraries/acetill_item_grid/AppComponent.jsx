import OneComponent from "../shared/primitives/ItemGrid/ItemGrid.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function AcetillItemGrid(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"ItemGrid")}/></UneFrame>}
