import ResponsiveDataList from '../../records/ResponsiveDataList/ResponsiveDataList';
import { useState } from 'react';
import { Copy, Pencil, Search } from 'lucide-react';
import type { LightningAppMetadata } from '../../metadata/Definitions/metadata';
import './AppManagerList.css';

type Props = {
  apps: LightningAppMetadata[];
  busy: boolean;
  onEdit: (app: LightningAppMetadata) => void;
  onClone: (app: LightningAppMetadata) => void;
};

export default function AppManagerList({apps, busy, onEdit, onClone}: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{key:string;direction:'asc'|'desc'}>({key:'label',direction:'asc'});
  const sortBy = (key:string) => setSort(p => ({key,direction:p.key===key&&p.direction==='asc'?'desc':'asc'}));
  const countLabel = (n:number,word:string) => `${n} ${word}${n===1?'':'s'}`;
  const filtered = apps.filter(app =>
    (app.label + ' ' + app.apiName + ' ' + app.description)
      .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ).sort((a,b) => {
    const value=(app:LightningAppMetadata) => sort.key==='navigation'?app.navigationItems.length:sort.key==='pages'?app.navigationPageApiNames.length:String((app as unknown as Record<string,unknown>)[sort.key]??'');
    const left=value(a),right=value(b);
    const diff=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right));
    return (sort.direction==='asc'?diff:-diff)||a.label.localeCompare(b.label);
  });
  return <section className="app-manager-list surface" aria-label="Existing applications">
    <div className="app-manager-list-head">
      <div><h2>Existing Apps <span>{apps.length}</span></h2>
        <p>Select Edit to configure an app, or Clone to use its settings as a starting point.</p>
      </div>
      <label className="app-manager-list-search">
        <Search size={16} aria-hidden="true"/>
        <input type="search" value={search} aria-label="Search apps"
          onChange={event => setSearch(event.target.value)} placeholder="Search apps…"/>
      </label>
    </div>
    <ResponsiveDataList rows={filtered} includeTablet getId={app=>app.apiName} label="Applications"
      onOpen={app=>onEdit(app)} openLabel="Edit application"
      columns={[
        {apiName:'name',label:'Application',phoneRole:'title',render:app=>app.label},
        {apiName:'apiName',label:'Developer name',phoneRole:'subtitle',render:app=>app.apiName},
        {apiName:'description',label:'Description',render:app=>app.description || '—'},
        {apiName:'pages',label:'Pages',phoneRole:'badge',render:app=>countLabel(app.navigationPageApiNames.length,'page')},
        {apiName:'navigation',label:'Navigation',phoneRole:'trailing',render:app=>countLabel(app.navigationItems.length,'item')},
        {apiName:'actions',label:'Actions',render:app=><div className="app-manager-list-actions">
         <button type="button" className="btn" aria-label={'Edit '+app.label} disabled={busy} onClick={event=>{event.stopPropagation();onEdit(app);}}>Edit</button>
         <button type="button" className="btn" aria-label={'Clone '+app.label} disabled={busy} onClick={event=>{event.stopPropagation();onClone(app);}}>Clone</button>
        </div>}
      ]}/>
    <div className="app-manager-list-scroll md-mobile-table-replaced md-tablet-table-replaced">
      <table className="app-manager-list-table">
        <thead><tr>
          <th scope="col" aria-sort={sort.key==='label'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="app-manager-sort" onClick={() => sortBy('label')}>App{sort.key==='label'?(sort.direction==='asc'?' ↑':' ↓'):''}</button></th>
          <th scope="col" aria-sort={sort.key==='apiName'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="app-manager-sort" onClick={() => sortBy('apiName')}>Developer Name{sort.key==='apiName'?(sort.direction==='asc'?' ↑':' ↓'):''}</button></th>
          <th scope="col" aria-sort={sort.key==='description'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="app-manager-sort" onClick={() => sortBy('description')}>Description{sort.key==='description'?(sort.direction==='asc'?' ↑':' ↓'):''}</button></th>
          <th scope="col" aria-sort={sort.key==='navigation'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="app-manager-sort" onClick={() => sortBy('navigation')}>Navigation Items{sort.key==='navigation'?(sort.direction==='asc'?' ↑':' ↓'):''}</button></th>
          <th scope="col" aria-sort={sort.key==='pages'?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className="app-manager-sort" onClick={() => sortBy('pages')}>App Pages{sort.key==='pages'?(sort.direction==='asc'?' ↑':' ↓'):''}</button></th>
          <th scope="col">Actions</th>
        </tr></thead>
        <tbody>{filtered.map(app => <tr key={app.apiName}>
          <td><div className="app-manager-list-name">
            <span className="app-manager-list-color" style={{backgroundColor:app.brandColor}} aria-hidden="true"/>
            <span><strong>{app.label}</strong></span>
          </div></td>
          <td><code>{app.apiName}</code></td>
          <td title={app.description || ''}>{app.description || '—'}</td>
          <td>{app.navigationItems.length}</td>
          <td>{app.navigationPageApiNames.length}</td>
          <td><div className="app-manager-list-actions">
            <button type="button" className="btn btn-small" disabled={busy}
              aria-label={'Edit ' + app.label} onClick={() => onEdit(app)} title={'Edit ' + app.label}>
              <Pencil size={14} aria-hidden="true"/> Edit
            </button>
            <button type="button" className="btn btn-small" disabled={busy}
              aria-label={'Clone ' + app.label} onClick={() => onClone(app)} title={'Clone ' + app.label}>
              <Copy size={14} aria-hidden="true"/> Clone
            </button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="app-manager-list-result-count" role="status">{filtered.length} of {apps.length} apps shown</p>
    {!filtered.length && <div className="app-manager-list-empty">
      {apps.length ? 'No apps match your search. Try a different name.' : 'No apps created yet. Select New App to get started.'}
    </div>}
  </section>;
}
