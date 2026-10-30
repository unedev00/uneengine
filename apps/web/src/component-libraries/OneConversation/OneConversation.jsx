import {readConversationPart} from '../une_conversation/conversationParts.mjs';
import {ConversationButton,ConversationSearch,ConversationInput,ConversationText} from '../une_conversation/ConversationParts.jsx';
function sendAction(props, event, value) {
  if (typeof props.onAction !== "function")
    throw Error("Configure a Flow action for this conversation event.");
  return Promise.resolve(props.onAction({ event, value }));
}

function ConversationInbox({ props }) {
 const optionalAction=(event,value)=>{
  if(!props.actionFlows?.[event]||typeof props.onAction!=="function")return;
  Promise.resolve(props.onAction({event,value})).catch(error=>setError(error instanceof Error?error.message:'Conversation action failed.'));
 };
  const [selectedId, setSelectedId] = React.useState("");
  const [newConversation, setNewConversation] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState("");
  const [search, setSearch] = React.useState(String(props.searchTerm||""));
  React.useEffect(()=>setSearch(String(props.searchTerm||"")),[props.searchTerm]);
  const [filter, setFilter] = React.useState("all");
  const [draft, setDraft] = React.useState("");
  const editorRef = React.useRef(null);
  const threadViewport = React.useRef(null);
  const followLatest = React.useRef(true);
  const lastThreadKey = React.useRef("");
  const [hasNewMessages,setHasNewMessages] = React.useState(false);
  // Page Builder may render this input across a document boundary. Native input
  // events keep drafts editable even if the React synthetic event is unavailable.
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const sync = () => setDraft(el.value);
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [selectedId, newConversation]);
  const [recipient, setRecipient] = React.useState("");
  const [contactSearch, setContactSearch] = React.useState("");
  const [selectedContact,setSelectedContact]=React.useState(null);
  const [assigneeId, setAssigneeId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const activeId=props.controlledSelection===true?String(props.selectedConversationId||""):selectedId;
  const conversations = Array.isArray(props.conversations)
    ? props.conversations
    : [];
  const messages = Array.isArray(props.messages) ? props.messages : [];
  const accounts = Array.isArray(props.channelAccounts)
    ? props.channelAccounts
    : [];
  const contacts = (Array.isArray(props.contactChoices) ? props.contactChoices : [])
    .slice(0,200).map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const nameField = String(props.contactNameFieldApiName || "Name");
      const phoneField = String(props.contactPhoneFieldApiName || "Phone");
      const name = row.name ?? row[nameField] ??
        [row.FirstName, row.LastName].filter(Boolean).join(" ");
      const phone = row.phone ?? row[phoneField] ?? row.Mobile ?? row.MobilePhone ?? "";
      return {id:String(row.id ?? row.Id ?? ""),name:String(name ?? ""),phone:String(phone ?? "")};
    }).filter((row) => row && row.id && row.phone);
  const allowed = Array.isArray(props.allowedAccountIds)
    ? props.allowedAccountIds.map(String)
    : [];
  const assignedAccounts = accounts.filter((account) =>
    allowed.includes(String(account.id)) ||
      (props.conversationAccessMode === "flowPermissions" && !allowed.length),
  );
  const visible = conversations.filter(
    (item) =>
      (!selectedAccount || String(item.channelAccountId) === selectedAccount) &&
      (!props.restrictToAssigned ||
        props.canViewAll === true ||
        !item.assignedUserId ||
        item.assignedUserId === props.currentUserId) &&
      (!allowed.length || allowed.includes(String(item.channelAccountId))),
  );
  const filtered = visible.filter(
    (item) =>
      (filter === "all" ||
        (filter === "unread" && Number(item.unreadCount) > 0) ||
        (filter === "mine" && item.assignedUserId === props.currentUserId)) &&
      [item.contactName, item.phoneNumber, item.preview]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const selected = visible.find((item) => String(item.id) === activeId);
  const thread = selected
    ? messages
        .filter((item) => String(item.conversationId) === String(selected.id))
        .sort((left, right) =>
          String(left.sentAt || "").localeCompare(String(right.sentAt || "")),
        )
    : [];
  const canSend = selected
    ? props.canSend===true&&(selected.canSend===true||props.requirePerRecordSendGrant===false)
    : (props.requireChannelAccountForNew===false&&props.canSend===true)||assignedAccounts.some(
        (account) =>
          String(account.id) === selectedAccount && account.canSend !== false,
      ) && Boolean(selectedAccount);
  const assigned = Array.isArray(props.eligibleAssignees)
    ? props.eligibleAssignees
    : [];
  const eligible = assigned.filter(
    (item) => selected && item.channelAccountId === selected.channelAccountId,
  );
  const send = async (event) => {
    event.preventDefault();
    const body = (editorRef.current?.value ?? draft).trim();
    if (!body || busy) return;
    if (!canSend) {setError(props.noSendPermissionText||"Sending is not authorised.");return;}
    if (!selected && !recipient.trim()) {
      setError("Enter a recipient before sending.");
      return;
    }
    if (!selected && !/^\+?[1-9]\d{5,14}$/.test(recipient.trim())) {
      setError("Enter an international phone number including country code.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const phone = String(selected?.phoneNumber ?? recipient.trim()).replace(/\D/g, "");
      let conversationId = selected?.id ?? JSON.stringify([selectedAccount, phone]);
      // Optional, reusable Flow chain for inbox models whose thread IDs are
      // derived from communication records rather than Conversation object IDs.
      // The original Flow definitions and permissions remain authoritative.
      if (props.enableSendPreparation === true && (!selected?.id || String(selected.id).startsWith("communication:"))) {
        if (!/^[1-9][0-9]{6,14}$/.test(phone))
          throw Error("A valid international recipient number is required.");
        const created = await sendAction(props, "create", {
          chatName: selected?.contactName || selectedContact?.name || phone, phoneNumber: phone,
          sourceObjectApi:selectedContact?.sourceObjectApi||"",sourceRecordId:selectedContact?.id||"" ,
        });
        if (created?.error || created?.interviewId)
          throw Error(String(created.error || "Conversation setup Flow did not finish."));
        const resolved = await sendAction(props, "resolve", { phoneNumber: phone });
        if (resolved?.error || resolved?.interviewId)
          throw Error(String(resolved.error || "Conversation lookup Flow did not finish."));
        const outputs = resolved?.outputs ?? {};
        const native = outputs.conversations ?? outputs.conversationsJson;
        let rows = native;
        if (typeof rows === "string") {
          if (rows.length > 500000) throw Error("Conversation Flow output too large.");
          rows = JSON.parse(rows);
        }
        if (!Array.isArray(rows) || rows.length > 200)
          throw Error("Conversation lookup must return a record collection.");
        const matching = rows.find((row) => row && typeof row === "object" &&
          String(row.PhoneNumber ?? "").replace(/\D/g, "") === phone);
        conversationId = String(matching?.Id ?? "");
        if (!conversationId) throw Error("No authorised conversation found for this number.");
      }
      const result = await sendAction(props, "send", {
        conversationId,
        channelAccountId: selected?.channelAccountId ?? selectedAccount,
        recipientPhone: phone,
        body,
      });
      if (result && result.error) throw Error(String(result.error));
      if (result === null || result === false) return;
      setDraft("");
      if (editorRef.current) editorRef.current.value = "";
      setNotice(readConversationPart(props,"submissionNotice","text") || "Message request submitted.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to send message.",
      );
    } finally {
      setBusy(false);
    }
  };
  const act = async (event, value) => {
    setBusy(true);
    setError("");
    try {
      await sendAction(props, event, value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  const contactMatches = contacts
    .filter((contact) =>
      [contact.name, contact.phone]
        .join(" ")
        .toLowerCase()
        .includes(contactSearch.trim().toLowerCase()),
    )
    .slice(0, 30);
  const title = (item) =>
    item.contactName ||
    item.phoneNumber ||
    item.label ||
    item.name ||
    "Conversation";
  const lastMessageId=thread.length
    ?String(thread[thread.length-1]?.id||thread.length):"";
  React.useEffect(()=>{
    if(props.autoScrollOnNewMessage===false)return;
    const view=threadViewport.current;
    if(!view||!selected)return;
    const changed=lastThreadKey.current!==activeId;
    if(changed||followLatest.current){
      view.scrollTop=view.scrollHeight;
      followLatest.current=true;
      setHasNewMessages(false);
    }else if(lastMessageId)setHasNewMessages(true);
    lastThreadKey.current=activeId;
  },[activeId,lastMessageId,thread.length,props.autoScrollOnNewMessage]);
  React.useEffect(()=>{
    if(props.avoidKeyboardOverlap!==true || typeof window==='undefined'||!window.visualViewport)return;
    const view=threadViewport.current;
    const root=view?.closest('.one-conversation-inbox');
    if(!root)return;
    const viewport=window.visualViewport;
    const sync=()=>{
      // This offset is purely visual; the browser remains the source of truth.
      root.style.setProperty('--one-chat-viewport-height',viewport.height+'px');
    };
    sync();
    viewport.addEventListener('resize',sync);
    viewport.addEventListener('scroll',sync);
    return()=>{
      viewport.removeEventListener('resize',sync);
      viewport.removeEventListener('scroll',sync);
      root.style.removeProperty('--one-chat-viewport-height');
    };
  },[activeId,props.avoidKeyboardOverlap]);
  return (
    <section
      className={
        "one-conversation-inbox" +
        (props.avoidKeyboardOverlap===true?" one-conversation-inbox--viewport":"") +
        (selected || newConversation ? " one-conversation-inbox--open" : "")
      }
      style={{ "--one-accent": props.accentColor || "#168657" }}
    >
      <aside className="one-surface one-conversation-list">
        <header>
          <div className="one-row" style={{ justifyContent: "space-between" }}>
            <ConversationText as="h3" className="one-heading" text={readConversationPart(props,"heading","text") || "Conversations"}/>
            {props.showConversationCount!==false&&<span className="one-muted">{visible.length}</span>}
          </div>
          {props.enableNewConversation === true && (
            <ConversationButton
              className="one-btn"
              type="button"
              disabled={!assignedAccounts.length&&props.requireChannelAccountForNew!==false}
              onClick={() => {
                if(props.newConversationPresentation==="event"){optionalAction("newConversationOpen",{});return;}
                setSelectedId("");
                setNewConversation(true);
                setError("");
                setNotice("");
                setSelectedAccount(
                  (value) =>
                    value ||
                    String(
                      assignedAccounts.find(
                        (account) => account.canSend !== false,
                      )?.id || "",
                    ),
                );
              }}
            >
              {readConversationPart(props,"newConversation","label") || "New conversation"}
            </ConversationButton>
          )}
          {props.showRefresh===true&&<ConversationButton className="one-btn one-btn--ghost" type="button"
             disabled={!props.actionFlows?.refresh} onClick={()=>optionalAction("refresh",{selectedConversationId:activeId})}>
             {readConversationPart(props,"refresh","label")||"Refresh"}</ConversationButton>}
          {props.showAccountSelector!==false&&<label className="one-label">
            {props.accountLabel || "Account"}
            <select
              className="one-control"
              value={selectedAccount}
              disabled={!assignedAccounts.length}
              onChange={(event) => {
                setSelectedAccount(event.target.value);
                setSelectedId("");
                setNewConversation(false);
              }}
            >
              <option value="">
                {props.allAccountsLabel || "All assigned accounts"}
              </option>
              {assignedAccounts.map((account) => (
                <option key={account.id} value={String(account.id)}>
                  {account.name || account.id}
                </option>
              ))}
            </select>
          </label>}
          {props.showSearch!==false&&<ConversationSearch
            className="one-control"
            type="search"
            label={readConversationPart(props,"inboxSearch","label") || "Search conversations"}
            value={search}
            placeholder={readConversationPart(props,"inboxSearch","placeholder") || "Search conversations"}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={event=>{if(event.key==="Enter"&&props.searchMode==="event"){
              event.preventDefault();optionalAction("search",{searchTerm:search});}}}
          />}
          {props.showFilterTabs!==false&&<nav
            className="one-row"
            aria-label={readConversationPart(props,"filterHeading","text") || "Conversation filters"}
          >
            {(Array.isArray(props.filterOptions)&&props.filterOptions.length
              ?props.filterOptions.filter(item=>["all","unread","mine"].includes(item?.value))
              :["all","unread","mine"].map(value=>({value,label:props[value+"FilterLabel"]||value}))).map(({value,label}) => (
              <button
                className="one-btn one-btn--ghost"
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>}
        </header>
        {props.accessError && <p role="alert">{props.accessError}</p>}
        <div className="one-conversation-scroll">
          {filtered.map((item) => (
            <button
              className="one-conversation-row"
              type="button"
              key={item.id}
              aria-pressed={String(item.id) === activeId}
              onClick={() => {
                if(props.controlledSelection!==true)setSelectedId(String(item.id));
                optionalAction("select",{id:String(item.id),phoneNumber:item.phoneNumber,record:item});
                setNewConversation(false);
                setError("");
                setNotice("");
                setAssigneeId("");
              }}
            >
              <span className="one-conversation-avatar" aria-hidden="true">
                {String(title(item)).slice(0, 1).toUpperCase()}
              </span>
              <span className="one-conversation-copy">
                <strong>{title(item)}</strong>
                <small>{item.preview || item.phoneNumber || ""}</small>
                {item.channelAccountId && (
                  <small>
                    {accounts.find(
                      (account) =>
                        String(account.id) === String(item.channelAccountId),
                    )?.name || item.channelAccountId}
                  </small>
                )}
              </span>
              {Number(item.unreadCount) > 0 && (
                <span className="one-badge">{item.unreadCount}</span>
              )}
            </button>
          ))}
          {!filtered.length && (
            <p className="one-empty" role="status">
              {allowed.length || props.conversationSourceMode === "flowRecords"
                ? readConversationPart(props,"emptyInbox","text") ||
                  "No conversations match these filters."
                : props.noAccessText || "No conversation access is assigned."}
            </p>
          )}
        </div>
      </aside>
      <section className="one-surface one-conversation-thread">
        {!selected &&
        newConversation &&
        props.enableNewConversation === true ? (
          <form className="one-stack one-conversation-new" onSubmit={send}>
            <header className="one-conversation-header">
              <button
                className="one-btn one-btn--ghost one-conversation-back"
                type="button"
                onClick={() => setNewConversation(false)}
              >
                {props.backLabel || "Back to conversations"}
              </button>
              <h3 className="one-heading">
                {props.newConversationLabel || "New conversation"}
              </h3>
            </header>
            <label className="one-label">
              {props.accountLabel || "Account"}
              <select
                className="one-control"
                value={selectedAccount}
                onChange={(event) => setSelectedAccount(event.target.value)}
              >
                {assignedAccounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.name || account.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="one-label">
              {readConversationPart(props,"contactSearch","label") || "Find contact"}
              <input
                className="one-control"
                type="search"
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                onKeyDown={event=>{if(event.key==="Enter"){
                  event.preventDefault();optionalAction("contactSearch",{searchTerm:contactSearch});}}}
              />
            </label>
            {contactSearch &&
              contactMatches.map((contact) => (
                <button
                  className="one-btn one-btn--ghost"
                  type="button"
                  key={contact.id}
                  onClick={() => {
                    setRecipient(contact.phone || "");
                    setSelectedContact({...contact,sourceObjectApi:props.contactSourceObjectApi||""});
                    setContactSearch(contact.name || contact.phone || "");
                    optionalAction("contactSelect",{...contact,sourceObjectApi:props.contactSourceObjectApi||""});
                  }}
                >
                  {contact.name || contact.phone}
                </button>
              ))}
            <label className="one-label">
              {props.recipientLabel || "Recipient"}
              <input
                className="one-control"
                type="tel"
                required
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </label>
            <label className="one-label">
              {props.messageLabel || "Message"}
              <textarea
                className="one-control"
                required
                maxLength={Number(readConversationPart(props,"composer","maxLength")) || 4096}
                defaultValue={draft}
                ref={editorRef}
                onInput={(event) => setDraft(event.currentTarget.value)}
              />
            </label>
            <button
              className="one-btn one-btn--primary"
              type="submit"
              disabled={busy || !draft.trim() || !canSend}
            >
              {props.sendLabel || "Send"}
            </button>
          </form>
        ) : selected ? (
          <div className="one-conversation-active">
            <header className="one-conversation-header">
              <button
                className="one-btn one-btn--ghost one-conversation-back"
                type="button"
                onClick={() => {
                  if(props.controlledSelection!==true)setSelectedId("");
                  optionalAction("select",{id:"",phoneNumber:"",record:null});
                }}
              >
                {props.backLabel || "Back to conversations"}
              </button>
              <div>
                <h3 className="one-heading">{title(selected)}</h3>
                <span className="one-muted">{selected.phoneNumber || ""}</span>
              </div>
              {selected.canAssign === true &&
                props.enableAssignment === true && (
                  <div className="one-row">
                    <select
                      className="one-control"
                      aria-label={props.assignLabel || "Assign conversation"}
                      value={assigneeId}
                      disabled={busy}
                      onChange={(event) => setAssigneeId(event.target.value)}
                    >
                      <option value="">
                        {props.chooseAssigneeLabel || "Choose assignee"}
                      </option>
                      {eligible.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="one-btn"
                      type="button"
                      disabled={busy || !assigneeId}
                      onClick={() =>
                        void act("assign", {
                          conversationId: selected.id,
                          channelAccountId: selected.channelAccountId,
                          assigneeId,
                        })
                      }
                    >
                      {props.assignLabel || "Assign"}
                    </button>
                  </div>
                )}
            </header>
            <div
              className="one-conversation-messages"
              ref={threadViewport}
              onScroll={event=>{
                const el=event.currentTarget;
                const distance=el.scrollHeight-el.scrollTop-el.clientHeight;
                followLatest.current=distance<=Math.max(0,Number(props.messageAutoScrollThreshold)||100);
                if(followLatest.current)setHasNewMessages(false);
              }}
              role="log"
              aria-label={props.messagesLabel || "Messages"}
              aria-live="polite"
            >
              {thread.map((message) => (
                <article
                  className={
                    "one-message" +
                    (message.direction === "outbound" ||
                    message.direction === "Outgoing"
                      ? " one-message--me"
                      : "")
                  }
                  key={message.id}
                >
                  {message.mediaUrl && (
                    <a
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {message.mediaName ||
                        props.attachmentLabel ||
                        "Attachment"}
                    </a>
                  )}
                  {message.body && <div>{message.body}</div>}
                  <small>
                    {message.sentAt || ""} {props.showDeliveryStatus!==false?message.status||"":""}
                  </small>
                </article>
              ))}
              {!thread.length && (
                <p className="one-empty" role="status">
                  {props.emptyMessagesText || "No messages yet."}
                </p>
              )}
            </div>
            {hasNewMessages&&props.showNewMessageNotice!==false&&<ConversationButton
              className="one-btn one-btn--ghost" type="button"
              onClick={()=>{const el=threadViewport.current;if(el){el.scrollTop=el.scrollHeight;
                 followLatest.current=true;setHasNewMessages(false);}}}>
              {readConversationPart(props,"newMessages","label")||"New messages"}
            </ConversationButton>}
            {props.showComposer!==false&&<form className="one-row one-conversation-compose" onSubmit={send}>
              <ConversationInput
                className="one-control"
                aria-label={props.messageLabel || "Message"}
                defaultValue={draft}
                ref={editorRef}
                maxLength={Number(readConversationPart(props,"composer","maxLength")) || 4096}
                placeholder={readConversationPart(props,"composer","placeholder") || "Write a message…"}
                onInput={(event) => setDraft(event.currentTarget.value)}
              />
              <button
                className="one-btn one-btn--primary"
                type="submit"
                disabled={busy || !draft.trim() || !canSend}
              >
                {props.sendLabel || "Send"}
              </button>
            </form>}
            {props.showComposer!==false&&!canSend && (
              <p className="one-muted" role="status">
                {props.noSendPermissionText ||
                  "You do not have permission to send from this account."}
              </p>
            )}
          </div>
        ) : (
          <div className="one-empty" role="status">
            {readConversationPart(props,"emptyThread","text") || "Select a conversation"}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </section>
    </section>
  );
}

function ConversationThread({ props, rows }) {
  const [message, setMessage] = React.useState("");
  return (
    <section className="one-surface">
      <div
        aria-live="polite"
        style={{ minHeight: 120, maxHeight: 380, overflowY: "auto" }}
      >
        {rows.map((row, index) => (
          <div
            className={
              "one-message" +
              (row.mine || row.outbound ? " one-message--me" : "")
            }
            key={row.Id ?? row.id ?? index}
          >
            <div className="one-muted">
              {String(row.sender ?? row.author ?? "")}
            </div>
            {String(row.body ?? row.text ?? row.message ?? "")}
          </div>
        ))}
        {!rows.length && <div className="one-empty" role="status">No messages</div>}
      </div>
      <form
        className="one-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!message.trim()) return;
          void sendAction(props, "send", { body: message.trim() }).then(() =>
            setMessage(""),
          );
        }}
      >
        <input
          className="one-control"
          style={{ flex: 1 }}
          aria-label={props.messageLabel || "Message"}
          placeholder={readConversationPart(props,"composer","placeholder") || "Write a message…"}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button
          className="one-btn one-btn--primary"
          type="submit"
          disabled={!message.trim()}
        >
          {props.sendLabel || "Send"}
        </button>
      </form>
    </section>
  );
}

export default function OneConversation(props) {
  const rows = Array.isArray(props.records) ? props.records : [];
  if (props.viewMode === "inbox")
    return (
      <div className="one-ui one-conversation-root">
        <ConversationInbox props={props} />
      </div>
    );
  return (
    <div className="one-ui one-conversation-root">
      <ConversationThread props={props} rows={rows} />
    </div>
  );
}
