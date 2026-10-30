import UneSchedule from "../ui-runtime/shared/Schedule.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
export default function UiCalendar(props){return <UneFrame p={props}><UneSchedule {...uneProps(props,"Calendar")}/></UneFrame>}
