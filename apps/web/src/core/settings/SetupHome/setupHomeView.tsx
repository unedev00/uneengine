import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RefreshCw, ArrowRight, AlertCircle, ExternalLink, CircleHelp, Command } from 'lucide-react';
import { setupShortcuts, type WorkspaceId } from '../../metadata/Definitions/metadata';
type HeadingProps = { eyebrow?: string; title: string; description?: string; actions?: ReactNode };
export function createSetupHome(Heading: (props: HeadingProps) => ReactNode) {
function SetupHome({ onNavigate, request, onShowShortcuts, onOpenAuditTrail }: { onNavigate: (workspace: WorkspaceId) => void; request: <T>(path:string)=>Promise<T>; onShowShortcuts:()=>void; onOpenAuditTrail?:()=>void }) {
  type SecurityEvent = {id:string;at:string;action:string};
  const [events,setEvents] = useState<SecurityEvent[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [helpOpen,setHelpOpen] = useState(false);
  const [lastUpdated,setLastUpdated]=useState<number|null>(null);
  const reload = useCallback(() => {
    let active = true;
    setLoading(true);setError('');
    void request<{events:SecurityEvent[]}>('/auth/security-events?limit=3')
      .then(result => {if(active)setEvents(result.events ?? []);})
      .catch(() => {if(active){setError('Security activity unavailable for this user.');setEvents([]);}})
      .finally(() => {if(active){setLoading(false);setLastUpdated(Date.now());}});
    return () => {active=false;};
  },[request]);
  useEffect(() => reload(), [reload]);
  return (
    <div className="home-content">
      <Heading title="Setup Home" description="Configure objects, pages, flows and access permissions for your organisation."
        actions={<div className="setup-home-refresh"><button type="button" className="btn" onClick={reload} disabled={loading} aria-busy={loading}><RefreshCw size={14} />{loading?'Refreshing…':'Refresh'}</button>
          {lastUpdated&&<small role="status">Updated {new Date(lastUpdated).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</small>}</div>} />
      <div className="welcome-banner setup-home-summary">
        <div className="welcome-copy">
          <h2>Workspace overview</h2>
          <p>Open a tool below to manage metadata, automation, access and your applications.</p>
        </div>
      </div>
      <div className="home-section-title"><div><h2>Quick access</h2><p>Open setup tools for this organisation.</p></div></div>
      <div className="shortcut-grid">
        {setupShortcuts.map(({ title, description, workspace, icon: Icon }) => (
          <button key={title} className="shortcut-card" onClick={() => onNavigate(workspace)}>
            <span className="shortcut-icon"><Icon size={19} /></span><span className="shortcut-title">{title}</span><span className="shortcut-description">{description}</span><ArrowRight className="shortcut-arrow" size={15} />
          </button>
        ))}
      </div>
      <div className="home-lower-grid">
        <section className="surface recent-surface"><div className="section-heading"><h2>Recent security activity</h2></div>
          {loading ? <p role="status">Loading security activity…</p> : error ? <p role="status">{error}</p> : events.length === 0 ? <p>No security activity recorded.</p> :
            events.filter((event,index,list)=>list.findIndex(candidate=>candidate.action===event.action&&candidate.at===event.at)===index).map(event => {
              const failed=/(failed|denied|blocked|rejected)/i.test(event.action);
              return <div className="recent-row" key={event.id}>
                <span className={'recent-icon '+(failed?'red':'green')}>{failed?<AlertCircle size={16}/>:<ShieldCheck size={16}/>}</span>
                <div><strong>{event.action.replace(/([a-z])([A-Z])/g,'$1 $2')}</strong><small>Security event</small></div>
                <time dateTime={event.at} title={new Date(event.at).toLocaleString()}>{new Date(event.at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time>
              </div>;
            })}
          {onOpenAuditTrail && <button type="button" className="text-action" onClick={onOpenAuditTrail}>View full audit trail <ArrowRight size={14}/></button>}
        </section>
        <section className="surface help-surface"><div className="section-heading"><h2>Resources</h2><ExternalLink size={15} /></div><button type="button" className="resource-row" aria-expanded={helpOpen} aria-controls="md-setup-help-details" onClick={()=>setHelpOpen(open=>!open)}><span><CircleHelp size={16} /></span><div><strong>Setup help</strong><small>Learn how to configure your org</small></div><ChevronRight size={15} /></button>
          {helpOpen && <div id="md-setup-help-details" className="resource-help-details"><p>Use Object Manager to configure records and fields, Page Builder to arrange screens, Flows to automate work, and Permission Sets to control access.</p></div>}
          <button type="button" className="resource-row" onClick={onShowShortcuts}><span><Command size={16} /></span><div><strong>Keyboard shortcuts</strong><small>Work faster in Setup</small></div><ChevronRight size={15} /></button></section>
      </div>
    </div>
  );
}


return SetupHome;
}

