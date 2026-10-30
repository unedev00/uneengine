import OneComponent from "../../core/components/SharedRuntime/OneSearch.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/UneFrame.jsx";
// Private application settings live in code; existing runtime values take precedence.
const INTERNAL_DEFAULTS={
  "placeholder": "Search",
  "searchKey": "catalogue",
  "value": "",
  "label": "Search",
  "showSubmitButton": false,
  "submitLabel": "Search",
  "showSuggestions": false,
  "controlledValue": false
};
export default function AcetillSearch(props){return <UneFrame p={props}><OneComponent {...INTERNAL_DEFAULTS} {...uneProps(props,"Search")}/></UneFrame>}
