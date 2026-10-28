import { useEffect, useState } from 'react';

type RecordRow = { Id: string; [key: string]: unknown };
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
export default function OfflineRecordPicker({ request, objectApi, nameField, selected, onChange, disabled, remaining }: {
  request: Request; objectApi: string; nameField: string; selected: string[];
  onChange: (ids: string[]) => void; disabled: boolean; remaining: number;
}) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    setRows([]); setError(''); setLoading(Boolean(objectApi));
    if (!objectApi) return;
    const timer = window.setTimeout(() => {
      void request<{records: RecordRow[]}>(`/records/${encodeURIComponent(objectApi)}?${new URLSearchParams({search:query.trim(),limit:'20',offset:'0'})}`)
        .then(result => { if (active) { setRows(result.records); setLabels(previous => ({...previous,...Object.fromEntries(result.records.map(record => [record.Id, String(record[nameField] ?? record.Name ?? record.Id)]))})); } })
        .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to search records'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [request, objectApi, nameField, query]);
  return <div className="offline-record-picker">
    <label>Find records<input type="search" value={query} disabled={disabled || !objectApi} placeholder="Search records by name" onChange={event => setQuery(event.target.value)} /></label>
    <p role="status">{selected.length} records selected for this object{loading ? ' · Searching…' : ''}</p>
    {error && <p role="alert">{error}</p>}
    {selected.length > 0 && <ul aria-label="Selected records">{selected.map(id => <li key={id}><span>{labels[id] ?? id}</span> <button type="button" className="btn btn-small" disabled={disabled} aria-label={`Remove ${labels[id] ?? id}`} onClick={() => onChange(selected.filter(value => value !== id))}>Remove</button></li>)}</ul>}
    <div className="offline-record-results" aria-label="Matching records" aria-busy={loading}>
      {!loading && objectApi && !rows.length && !error && <p>No matching records. Try another name.</p>}
      {rows.map(record => <label key={record.Id}><input type="checkbox" checked={selected.includes(record.Id)} disabled={disabled || (!selected.includes(record.Id) && remaining <= 0)} onChange={event => onChange(event.target.checked ? [...selected,record.Id] : selected.filter(id => id !== record.Id))} />{String(record[nameField] ?? record.Name ?? record.Id)}</label>)}
    </div>
    <small>Showing up to 20 matches. Search to find more records.</small>
  </div>;
}
