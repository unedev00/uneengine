/**
 * Headless adapters for UNE child contracts inside Conversation.
 * Standalone UNE components introduce wrappers, so these native controls
 * keep Conversation's existing DOM, CSS classes, behaviour and accessibility.
 */
export function ConversationButton(props){return <button {...props}/>;}
export function ConversationSearch({label,...props}){return <input {...props} aria-label={label}/>;}
export function ConversationInput(props){return <input {...props}/>;}
export function ConversationText({as:Tag='span',text,...props}){return <Tag {...props}>{text}</Tag>;}
