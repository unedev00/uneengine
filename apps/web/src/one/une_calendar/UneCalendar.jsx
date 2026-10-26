import UneSchedule from "../une/shared/UneSchedule.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneCalendar(props){return <UneFrame p={props}><UneSchedule {...uneProps(props,"Calendar")}/></UneFrame>}
