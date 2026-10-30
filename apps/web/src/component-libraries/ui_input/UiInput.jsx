import {UneInput as Primitive} from "../ui-runtime/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
/** UNE Input is the single text-box renderer for display and entry. */
export default function UiInput(props){
 return <UneFrame p={props}>
  <Primitive {...uneProps(props,"Input")}/>
 </UneFrame>;
}
