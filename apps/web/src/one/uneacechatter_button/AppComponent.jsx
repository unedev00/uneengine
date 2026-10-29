import OneComponent from "../OneButton/OneButton.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneAceChatterButton(props){
 const p=uneProps(props,"Button");
 return <UneFrame p={{...props,width:"auto",height:"auto"}}><div className="une-button-control" style={{
  ...(props.width?{width:props.width}:{}),
  ...(props.height?{height:props.height}:{}),
  "--une-button-padding":p.padding+"px",
  "--une-button-gap":p.gap+"px"
 }}><OneComponent {...p}/></div></UneFrame>;
}
