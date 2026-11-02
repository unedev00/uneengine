import { useEffect, useId, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { reconcileNavigationOrder } from './appNavigation';
import type { LightningAppMetadata } from '../../metadata/Definitions/metadata';

export function resolveCurrentAppNavigation(app: LightningAppMetadata | undefined) {
  return app ? reconcileNavigationOrder(app.navigationItems ?? [], app.navigationPageApiNames ?? [], app.navigationOrder ?? []) : [];
}


/** Build identity is embedded in the served JavaScript, never inferred from current GitHub main. */
declare const __METADRIVE_WEB_RELEASE__: { commit: string | null; builtAt: string };

type ProductionStatus = {
 configured: boolean; canDeploy: boolean; latestCommit: string | null;
 workflowUrl?: string; error?: string;
 oci?: {state:'idle'|'running'|'succeeded'|'failed';sha:string|null;stage:string|null;updatedAt:string|null}|null;
 deployedCommit: string | null; active: boolean;
 run: null | {id:number;commit:string;status:string;conclusion:string|null;createdAt:string;url:string};
};
type DeploymentRequest = <T>(path:string,init?:RequestInit)=>Promise<T>;

type OracleRelease = { commit: string; deployedAt: string };
type OracleStatus = 'idle' | 'loading' | 'ready' | 'error';

function utcDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23'
  }).format(new Date(value)) + ' UTC';
}

export function NavigationLoadTime({ routeKey, startedAt, ready, kind, authMs, request }: {
  routeKey: string;
  startedAt: number;
  ready: boolean;
  kind: 'login' | 'restore' | 'navigation';
  authMs: number | null;
  request?: DeploymentRequest;
}) {
  const [result, setResult] = useState<{ routeKey: string; milliseconds: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [newFrontendAvailable, setNewFrontendAvailable] = useState(false);
  const [deployment, setDeployment] = useState<ProductionStatus | null>(null);
  const [deploymentError, setDeploymentError] = useState('');
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentRequested, setDeploymentRequested] = useState(false);
  const [requestedAfterRunId, setRequestedAfterRunId] = useState<number | null>(null);
  const [oracle, setOracle] = useState<{ status: OracleStatus; release: OracleRelease | null }>({ status: 'idle', release: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    const loaded = typeof __METADRIVE_WEB_RELEASE__ === 'undefined'
      ? null : __METADRIVE_WEB_RELEASE__?.commit;
    if (!loaded) return;
    let stopped = false;
    const checkRelease = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/frontend-release.json', {cache:'no-store'});
        if (!response.ok) return;
        const release:unknown = await response.json();
        if (!stopped && release && typeof release === 'object'
          && 'commit' in release && typeof release.commit === 'string'
          && /^[a-f0-9]{40}$/.test(release.commit) && release.commit !== loaded)
          setNewFrontendAvailable(true);
      } catch { /* Offline clients continue working without a forced refresh. */ }
    };
    void checkRelease();
    const interval = window.setInterval(() => {void checkRelease();},60_000);
    document.addEventListener('visibilitychange',checkRelease);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange',checkRelease);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    setOracle({ status: 'loading', release: null });
    // The Oracle API supplies the running server release; the bundled client SHA
    // below identifies the frontend actually loaded in this browser tab.
    void fetch('/api/health', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Oracle health unavailable');
        return response.json() as Promise<{ release?: { commit?: unknown; deployedAt?: unknown } | null }>;
      })
      .then(data => {
        if (!active) return;
        const candidate = data?.release;
        const release = typeof candidate?.commit === 'string'
          && /^[a-f0-9]{40}$/.test(candidate.commit)
          && typeof candidate.deployedAt === 'string'
          && Number.isFinite(Date.parse(candidate.deployedAt))
          ? { commit: candidate.commit, deployedAt: candidate.deployedAt } : null;
        setOracle({ status: 'ready', release });
      })
      .catch(() => {
        if (active) setOracle({ status: 'error', release: null });
      });
    return () => { active = false; controller.abort(); };
  }, [open]);

  useEffect(() => {
    if (!open || !request) return;
    let cancelled = false;
    setDeploymentLoading(true);
    const check = async () => {
      try {
        const status = await request<ProductionStatus>('/platform/production-deployment');
        if (!cancelled) {
          setDeployment(status);
          setDeploymentError('');
          setDeploymentLoading(false);
          // A workflow_dispatch may take time to appear in GitHub. An older
          // completed run must not re-enable the button after acceptance.
          if (requestedAfterRunId !== null && (status.oci?.state === 'running' ||
            status.oci?.state === 'succeeded' || status.oci?.state === 'failed') &&
            status.oci.sha === status.latestCommit) {
            setDeploymentRequested(false);
            setRequestedAfterRunId(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDeployment(null);
          setDeploymentLoading(false);
          setDeploymentError(error instanceof Error ? error.message : 'Deployment status unavailable');
        }
      }
    };
    void check();
    // Read-only GitHub metadata is public and rate limited. Allow OCI job
    // progress to update without refreshing the page after a deployment request.
    const interval = window.setInterval(() => {void check();},
      deployment?.active || deploymentRequested ? 30_000 : 180_000);
    return () => {cancelled = true; window.clearInterval(interval);};
  }, [open, request, requestedAfterRunId, deployment?.active, deploymentRequested]);

  const deployLatest = async () => {
    if (!request || !deployment?.canDeploy || !deployment.latestCommit ||
      deployment.active || deploymentBusy || deploymentRequested) return;
    if (!window.confirm('Deploy latest main commit ' + deployment.latestCommit.slice(0,12) +
      ' to production? This runs the existing validation, SQL backup and full-stack release workflow.')) return;
    setDeploymentBusy(true);
    setDeploymentError('');
    try {
      await request('/platform/production-deployment', {method:'POST',
        body:JSON.stringify({expectedCommit:deployment.latestCommit})});
      setRequestedAfterRunId(deployment.run?.id ?? 0);
      setDeploymentRequested(true);
    } catch (error) {
      setDeploymentError(error instanceof Error ? error.message : 'Deployment request failed');
    } finally {
      setDeploymentBusy(false);
    }
  };

  useEffect(() => {
    // Never declare a screen loaded while its essential metadata is outstanding.
    if (!ready) return;
    let idleTimer: number | undefined;
    let observer: MutationObserver | undefined;
    let cancelled = false;
    let animation: number | undefined;
    const complete = () => {
      if (cancelled) return;
      cancelled = true;
      observer?.disconnect();
      window.clearTimeout(idleTimer);
      setResult({ routeKey, milliseconds: Math.max(0, performance.now() - startedAt) });
    };
    const schedule = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        const content = document.querySelector('.lightning');
        const stillLoading = content?.querySelector('[aria-busy="true"], [role="progressbar"], .records-loading, .loading-spinner');
        if (stillLoading) schedule();
        else complete();
      }, 120);
    };
    animation = window.requestAnimationFrame(() => {
      const content = document.querySelector('.lightning');
      if (content) {
        // Background notifications, header health and editor loads are not
        // landing-page blockers. Only extend the timer for a real busy UI.
        observer = new MutationObserver(() => {
          if (content.querySelector('[aria-busy="true"], [role="progressbar"], .records-loading, .loading-spinner')) schedule();
        });
        observer.observe(content, { childList: true, subtree: true, characterData: true });
      }
      schedule();
    });
    return () => {
      cancelled = true;
      if (animation !== undefined) window.cancelAnimationFrame(animation);
      observer?.disconnect();
      window.clearTimeout(idleTimer);
    };
  }, [routeKey, startedAt, ready]);
  const isEntry = kind !== 'navigation';
  const label = kind === 'login' ? 'Login → Landing' : kind === 'restore' ? 'Session → Landing' : 'Page navigation';
  const completed = result?.routeKey === routeKey;
  const requestSeconds = authMs === null ? null : (authMs / 1000).toFixed(2);
  const showTimings = import.meta.env.VITE_SHOW_NAV_TIMINGS !== 'false';
  const timing = completed ? `${label}: ${(result!.milliseconds / 1000).toFixed(2)}s` : `${label}: Loading…`;
  const webRelease = typeof __METADRIVE_WEB_RELEASE__ === 'undefined' ? null : __METADRIVE_WEB_RELEASE__;
  const oracleValue = oracle.status === 'loading' ? 'Checking…' : oracle.release?.commit.slice(0, 12) ?? 'Not available';
  return <div className="navigation-diagnostics" ref={containerRef}>
    {newFrontendAvailable && <button type="button" className="btn btn-small"
      style={{marginRight:8,whiteSpace:'nowrap'}}
      title="A newer frontend is deployed. Save any Page Builder changes before reloading."
      onClick={() => window.location.reload()}>Update available — reload</button>}
    <button ref={buttonRef} type="button" className="icon-button navigation-diagnostics-trigger"
      aria-label="System and release information" title="System and release information"
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popoverId : undefined}
      onClick={() => setOpen(current => !current)}>
      <Settings size={17} aria-hidden="true" />
    </button>
    {open && <section id={popoverId} className="navigation-diagnostics-popover" role="dialog"
      aria-label="System and release information">
      <strong className="navigation-diagnostics-heading">System information</strong>
      <dl className="navigation-diagnostics-details">
        {showTimings && <>
          <div><dt>Screen load</dt><dd role="status" title={isEntry
            ? `From ${kind === 'login' ? 'Sign in click' : 'session restoration'} until landing content is ready. session request: ${requestSeconds ?? 'unknown'}s.`
            : 'From route navigation until page content is ready.'}>{timing}</dd></div>
          {isEntry && requestSeconds !== null && <div><dt>Authentication</dt><dd>{requestSeconds}s</dd></div>}
        </>}
        <div><dt>Oracle API release</dt><dd title={oracle.release?.commit}>{oracleValue}</dd></div>
        <div><dt>Oracle deployed</dt><dd>{oracle.status === 'loading' ? 'Checking…' : utcDate(oracle.release?.deployedAt)}</dd></div>
        <div><dt>Frontend commit</dt><dd title={webRelease?.commit ?? undefined}>{webRelease?.commit?.slice(0, 12) ?? 'Not available'}</dd></div>
        <div><dt>Frontend built</dt><dd>{utcDate(webRelease?.builtAt)}</dd></div>
      </dl>
      <div className="navigation-deployment-control" aria-label="Production deployment">
        <strong className="navigation-deployment-heading">Production deployment</strong>
        <dl className="navigation-diagnostics-details">
          <div><dt>Latest main commit</dt><dd title={deployment?.latestCommit ?? undefined}>
            {deploymentLoading && !deployment ? 'Checking…' :
             deployment?.latestCommit?.slice(0,12) ?? 'Unavailable'}</dd></div>
          <div><dt>OCI deployment</dt><dd>
            {deployment?.oci?.state === 'running'
              ? 'Running: '+(deployment.oci.stage ?? 'preparing')
              : deployment?.oci?.state === 'succeeded' ? 'Last OCI run succeeded'
              : deployment?.oci?.state === 'failed' ? 'Last OCI run failed'
              : deploymentRequested ? 'Request accepted' : 'Idle'}</dd></div>
          <div><dt>GitHub workflow</dt><dd>
            {deployment?.active && deployment.run && deployment.run.status !== 'completed'
              ? 'Running' :
             deploymentRequested ? 'Checking…' :
             deployment?.run?.status === 'completed'
              ? deployment.run.conclusion === 'success' ? 'Last run succeeded' : 'Last run failed'
              : deploymentLoading ? 'Checking…' : deployment ? 'Not running' : 'Unavailable'}</dd></div>
        </dl>
        <button type="button" className="btn btn-small navigation-deployment-button"
          disabled={!request || !deployment?.canDeploy || !deployment.configured ||
            !deployment.latestCommit || deploymentBusy || deployment.active || deploymentRequested ||
            (deployment.latestCommit === deployment.deployedCommit &&
             deployment.latestCommit === webRelease?.commit &&
             deployment.run?.conclusion !== 'failure')}
          title={!deployment?.canDeploy ? 'Platform Developer deployment permission required'
            : !deployment.configured ? 'The OCI deployment broker is unavailable'
            : deployment.active ? 'A deployment is already running'
            : undefined}
          onClick={() => {void deployLatest();}}>
          {deploymentBusy ? 'Requesting…' : deployment?.active ? 'Deployment running' :
           deploymentRequested ? 'Deployment requested' : 'Deploy latest'}
        </button>
        {deployment && !deployment.canDeploy && <p className="navigation-diagnostics-note">
          Deploy requires Platform Developer permission and PlatformOperations manage access.
        </p>}
        {deployment && !deployment.configured && <p className="navigation-diagnostics-note">
          OCI deployment helper is unavailable. Production operators can inspect the existing OCI operations service.
        </p>}
        {deployment && deployment.canDeploy && deployment.configured &&
          deployment.latestCommit === deployment.deployedCommit &&
          deployment.latestCommit === webRelease?.commit &&
          deployment.run?.conclusion !== 'failure' &&
          <p className="navigation-diagnostics-note">Production is up to date.</p>}
        {deployment?.error && <p className="navigation-diagnostics-note" role="alert">
          {deployment.error}</p>}
        {deploymentError && <p className="navigation-diagnostics-note" role="alert">
          {deploymentError}</p>}
        {deployment?.active && <p className="navigation-diagnostics-note">
          Another production release is in progress.</p>}
        {deployment?.latestCommit && deployment.latestCommit !== webRelease?.commit &&
          <p className="navigation-diagnostics-note">
            Save changes before refreshing after deployment.</p>}
        <a href={deployment?.run?.url ??
          deployment?.workflowUrl ??
          'https://github.com/unedev00/uneengine/actions/workflows/oracle-api-deploy.yml'}
          target="_blank" rel="noopener noreferrer" className="navigation-deployment-link">
          Open GitHub workflow history</a>
      </div>
      {oracle.status === 'error' && <p className="navigation-diagnostics-note">Oracle API could not be reached.</p>}
      {oracle.status === 'ready' && !oracle.release && <p className="navigation-diagnostics-note">This API does not report release details yet.</p>}
    </section>}
  </div>;
}
