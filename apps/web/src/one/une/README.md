# UNE contract / parity gate

UNE is an additional visual component library using the existing Page Builder,
published Page Runtime, OneEngine RBAC, SQL component registry and Action/Flow engine.
The legacy catalog cleanup is retained: only eight One components exist.

The separate UNE AceChatter application creates metadata-driven pages only when a tenant
explicitly installs that AppExchange entry. Existing standalone AceChatter is preserved.

Shared editor types include Object/Field, FIELD_LIST, COLUMNS, OPTIONS and
RECORD_LIST. Collections are supplied by authorised Object/Flow data.
Business operations remain in Flows; the client only renders transient state.

## Not yet certified to parity
- Browser save/draft/publish/reload and dynamic collection/Flow output journeys.
- AceKiosk: nested modifier groups, basket selections and full checkout.
- Acetill: POS PIN and locks, SRN, held sale, second customer screen and print.
- AceChatter: contact-to-thread send/poll and mobile viewport behaviour.
- AceAssist: timezone-aware available slots, day/week/agenda calendar,
  multi-resource scheduling and quotation/invoice totals and lines.
- Mobile/desktop screenshot comparisons versus original app screens.

Release gate: never claim 100% parity before each unchanged original screen is
recreated from published page metadata, tested visually and functionally with
tenant RBAC, and accepted independently. This PR is foundation only.

UNE Option Groups renders nested, required or multi-choice modifier groups from an authorised Flow record collection. Its selection payload contains groupId and choiceId; the Flow owns pricing and order validation.
