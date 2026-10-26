import OneComponent from "../OneConversation/OneConversation.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
import {presentFlowConversationCollections} from "./flowConversationPresenter.js";
export default function UneConversation(props){
 const p=uneProps(props,"Conversation");
 // Flow records are already tenant/field/record-authorised; only their presentation
 // is transformed here. All mappings are Page Builder properties.
 const flow=p.conversationSourceMode==="flowRecords"?presentFlowConversationCollections(p):null;
 const mapped=flow?{...p,conversations:flow.conversations,messages:flow.messages,
  channelAccounts:Array.isArray(p.channelAccounts)&&p.channelAccounts.length?p.channelAccounts:flow.channelAccounts}:p;
 return <UneFrame p={props}><OneComponent {...mapped}/></UneFrame>;
}
