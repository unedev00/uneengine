export interface ConversationPartSlot {
 readonly id:string;readonly label:string;readonly component:string;
 readonly bindings:Readonly<Record<string,string>>;
}
export declare const conversationPartSlots:ReadonlyArray<ConversationPartSlot>;
export declare function conversationRootDefinition<T>(definition:T):T;
export declare function conversationPartDefinition(id:string,parent:any,catalog:readonly any[]):any;
export declare function conversationPartEditorProperties(parent:Record<string,unknown>,id:string):Record<string,unknown>;
export declare function updateConversationPartProperties(parent:Record<string,unknown>,id:string,edited:Record<string,unknown>):Record<string,unknown>;
export declare function readConversationPart(props:Record<string,unknown>,id:string,key:string):unknown;
