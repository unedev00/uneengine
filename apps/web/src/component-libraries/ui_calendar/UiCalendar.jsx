import UneSchedule from "../ui-runtime/shared/UneSchedule.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
export default function UiCalendar(props){return <UneFrame p={props}><UneSchedule {...uneProps(props,"Calendar")}/></UneFrame>}
