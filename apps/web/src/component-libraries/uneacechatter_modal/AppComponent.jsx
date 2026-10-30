import {UneModal as Primitive} from "../ui-runtime/shared/Layout.jsx";
import {UneFrame,uneProps} from "../ui-runtime/shared/Frame.jsx";
// Private application settings live in code; existing runtime values take precedence.
const INTERNAL_DEFAULTS={
  "layoutContainer": true,
  "title": "Dialog",
  "openLabel": "Open",
  "startOpen": false,
  "controlledOpen": false,
  "isOpen": false,
  "showTrigger": true,
  "showCloseButton": true,
  "closeOnBackdrop": true,
  "closeOnEscape": true,
  "fullScreenOnMobile": false
};
export default function UneAceChatterModal(props){return <UneFrame p={props}><Primitive {...INTERNAL_DEFAULTS} {...uneProps(props,"Modal")}/></UneFrame>}
