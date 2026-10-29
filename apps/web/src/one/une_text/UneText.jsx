import OneComponent from "../OneText/OneText.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";

// Keep the shared OneText renderer for existing bindings and typography.
// Paint the UNE-specific surface here, where its metadata tokens are available.
export default function UneText(props){
 return <UneFrame p={props}>
  <div className="une-text-surface" data-une-accent={props.accentColor?"custom":"default"}>
   <OneComponent {...uneProps(props,"Text")} multilineGap />
  </div>
 </UneFrame>;
}
