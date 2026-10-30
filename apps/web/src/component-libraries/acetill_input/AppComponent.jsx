import {UneInput as Primitive} from "../ui-runtime/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
/** UNE Input is the single text-box renderer for display and entry. */
export default function AcetillInput(props){
 return <UneFrame p={props}>
  <div className="une-input-surface" data-une-accent={props.accentColor?"custom":"default"}>
   <Primitive {...uneProps(props,"Input")}/>
  </div>
 </UneFrame>;
}
