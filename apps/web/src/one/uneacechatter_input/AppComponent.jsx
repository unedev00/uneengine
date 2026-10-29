import InternalInput from '../une_input/UneInput.jsx';
// Preserve the legacy title prop while this app now owns the renderer identity.
export default function AppInput(props){ return <InternalInput {...props} value={props.value??props.text}/>; }
