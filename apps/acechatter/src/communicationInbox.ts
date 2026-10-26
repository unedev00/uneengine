export type InboxRecord = Record<string, unknown>;

const pick = (row: InboxRecord, ...keys: string[]): unknown =>
  keys.map(key => row[key]).find(value => value !== undefined && value !== null);

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : value == null ? '' : String(value);

export const normalizeChatNumber = (value: unknown): string =>
  stringValue(value).replace(/\D/g, '');

const directionOf = (row: InboxRecord): string =>
  stringValue(pick(row, 'Direction', 'MessageDirection')).toLowerCase();

/** Status webhooks and integration diagnostics are not chat messages. */
const isWhatsAppCommunication = (row: InboxRecord): boolean =>
  stringValue(pick(row, 'Channel')).toLowerCase() === 'whatsapp'
  && stringValue(pick(row, 'Body')).length > 0
  && !stringValue(pick(row, 'ExternalMessageId')).startsWith('wa-status-')
  && !stringValue(pick(row, 'Name')).startsWith('WhatsApp delivery status:');

/** Communication records describe the business as Sender on outbound rows, so the
 * customer thread key must come from Recipient for outbound and Sender for inbound. */
export function communicationSenderPhone(row: InboxRecord): string {
  const direction = directionOf(row);
  const participant = direction.includes('out')
    ? pick(row, 'Recipient')
    : direction.includes('in')
      ? pick(row, 'Sender')
      : pick(row, 'Sender') ?? pick(row, 'Recipient');
  // Inbound display names are commonly formatted "Name (+4477...)". Extract
  // only the phone number, not digits that may occur in the contact's name.
  const text = stringValue(participant);
  const wrapped = text.match(/\((\+?[0-9\s()-]{7,22})\)\s*$/);
  const digits = normalizeChatNumber(wrapped?.[1] ?? text);
  return /^\d{7,15}$/.test(digits) ? digits : '';
}

/** Only Contacts may supply customer display names.
 * WhatsApp profile names can change and are not a stable identity source. */
export function contactDisplayName(row: InboxRecord): string {
  const name = stringValue(pick(row,'Name','DisplayName','ContactName'));
  if(name)return name;
  return [pick(row,'FirstName','GivenName'),pick(row,'LastName','FamilyName')]
    .map(stringValue).filter(Boolean).join(' ');
}

/** Resolve all permitted contact number fields, not just the first non-null
 * one: a Contact can have both a landline and a WhatsApp mobile number. */
export function contactPhoneNumbers(row: InboxRecord): string[] {
  return [...new Set(['WhatsAppPhoneNumber','WhatsAppPhone','Mobile','MobilePhone',
    'PhoneNumber','Phone'].map(field=>normalizeChatNumber(row[field]))
    .filter(phone=>/^[1-9][0-9]{6,14}$/.test(phone)))];
}


const occurredAt = (row: InboxRecord): string => {
  const direction = directionOf(row);
  const value = direction.includes('out')
    ? pick(row, '__lastMessageAt', 'SentAt', 'ReceivedAt', 'CreatedAt', 'CreatedDate', 'LastModifiedDate')
    : pick(row, '__lastMessageAt', 'ReceivedAt', 'SentAt', 'CreatedAt', 'CreatedDate', 'LastModifiedDate');
  return stringValue(value);
};

const timeValue = (row: InboxRecord): number => {
  const value = Date.parse(occurredAt(row));
  return Number.isFinite(value) ? value : 0;
};

/** Merge Flow-authorised ChatConversation records with WhatsApp Communication records.
 * A phone number is the stable inbox key; missing conversations remain sendable by
 * creating the normal ChatConversation through its authorised Flow before sending. */
export function buildCommunicationInbox(
  conversations: readonly InboxRecord[],
  communications: readonly InboxRecord[],
  searchTerm = '',
  contacts: readonly InboxRecord[] = []
): InboxRecord[] {
  const byPhone = new Map<string, InboxRecord>();
  const businessPhones = new Set<string>();
  const customerPhones = new Set<string>();
  // Resolve labels from authorised Contact records, matched by E.164 digits.
  // Sorting makes a duplicate phone's label deterministic across Flow orders.
  const contactsByPhone = new Map<string,string>();
  const sortedContacts = [...contacts].sort((a,b)=>
    stringValue(pick(a,'Id','id')).localeCompare(stringValue(pick(b,'Id','id'))));
  for(const contact of sortedContacts){
    const name=contactDisplayName(contact);
    if(!name)continue;
    for(const phone of contactPhoneNumbers(contact)){
      if(!contactsByPhone.has(phone))contactsByPhone.set(phone,name);
    }
  }
  // Infer the business number from inbound message recipient and status events;
  // never create a customer thread for the business itself.
  for (const row of communications) {
    const direction = directionOf(row);
    const statusCallback = stringValue(pick(row,'ExternalMessageId')).startsWith('wa-status-')
      || stringValue(pick(row,'Name')).startsWith('WhatsApp delivery status:');
    if (statusCallback) {
      const ownPhone = normalizeChatNumber(pick(row,'Sender'));
      if (/^\d{7,15}$/.test(ownPhone)) businessPhones.add(ownPhone);
      continue;
    }
    if (!isWhatsAppCommunication(row)) continue;
    const phone = communicationSenderPhone(row);
    if (!phone) continue;
    customerPhones.add(phone);
    if (direction.includes('in')) {
      const ownPhone = normalizeChatNumber(pick(row,'Recipient'));
      if (/^\d{7,15}$/.test(ownPhone)) businessPhones.add(ownPhone);
    }
  }

  for (const row of conversations) {
    const phone = normalizeChatNumber(pick(row, 'PhoneNumber'));
    if (!/^\d{7,15}$/.test(phone) || byPhone.has(phone)) continue;
    if (businessPhones.has(phone) && !customerPhones.has(phone)) continue;
    byPhone.set(phone, {
      ...row, PhoneNumber:phone,
      Name:contactsByPhone.get(phone) || phone,
      __syntheticConversation:false
    });
  }

  for (const row of communications) {
    if (!isWhatsAppCommunication(row)) continue;
    const phone = communicationSenderPhone(row);
    if (!phone || businessPhones.has(phone) && !customerPhones.has(phone)) continue;
    const timestamp = occurredAt(row);
    const displayName = contactsByPhone.get(phone) || phone;
    const previous = byPhone.get(phone);
    const isLatest = !previous || Date.parse(timestamp) >= timeValue(previous);

    if (previous) {
      byPhone.set(phone, {
        ...previous,
        Name:displayName,
        PhoneNumber:phone,
        __isCommunicationBacked:true,
        __lastMessageAt: isLatest ? timestamp : stringValue(previous.__lastMessageAt),
        __lastMessageBody: isLatest
          ? stringValue(pick(row, 'Body'))
          : stringValue(previous.__lastMessageBody)
      });
    } else {
      byPhone.set(phone, {
        Id: 'communication:' + phone,
        Name: displayName,
        PhoneNumber: phone,
        Status: 'WhatsApp',
        __syntheticConversation: true,
        __isCommunicationBacked: true,
        __lastMessageAt: timestamp,
        __lastMessageBody: stringValue(pick(row, 'Body'))
      });
    }
  }

  const term = stringValue(searchTerm).toLowerCase();
  const digits = normalizeChatNumber(searchTerm);
  return [...byPhone.values()]
    .filter(row => {
      if (!term) return true;
      const phone = normalizeChatNumber(pick(row, 'PhoneNumber'));
      const name = stringValue(pick(row, 'Name')).toLowerCase();
      return (digits.length >= 3 && phone.includes(digits)) || name.includes(term);
    })
    .sort((a, b) => timeValue(b) - timeValue(a) ||
      stringValue(pick(a, 'Name')).localeCompare(stringValue(pick(b, 'Name'))));
}

/** Communication is authoritative for both directions. Keep legacy Flow-created
 * ChatMessage rows only when they aren't already represented by a provider message ID. */
export function mergeCommunicationMessages(
  communications: readonly InboxRecord[],
  chatMessages: readonly InboxRecord[],
  phoneNumber: unknown
): InboxRecord[] {
  const phone = normalizeChatNumber(phoneNumber);
  const matching = communications.filter(row =>
    isWhatsAppCommunication(row) && communicationSenderPhone(row) === phone);
  const seen = new Set<string>();
  const unique: InboxRecord[] = [];

  for (const row of [...matching, ...chatMessages]) {
    const externalId = stringValue(pick(row, 'ExternalMessageId'));
    if (externalId && seen.has(externalId)) continue;
    if (externalId) seen.add(externalId);
    unique.push(row);
  }

  return unique.sort((a, b) => timeValue(a) - timeValue(b));
}
