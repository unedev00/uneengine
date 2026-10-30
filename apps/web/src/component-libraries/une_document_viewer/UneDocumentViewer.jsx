import {UneDocumentViewer as Primitive} from "../une/shared/UneDisplay.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneDocumentViewer(props){return <UneFrame p={props}><Primitive {...uneProps(props,"DocumentViewer")}/></UneFrame>}
