import {UneInput as Primitive} from "../une/shared/UneInputs.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
/** UNE Input is the single text-box renderer for display and entry. */
export default function OnechatterInput(props){
 return <UneFrame p={props}>
  <div className="une-input-surface" data-une-accent={props.accentColor?"custom":"default"}>
   <Primitive {...uneProps(props,"Input")}/>
  </div>
 </UneFrame>;
}
