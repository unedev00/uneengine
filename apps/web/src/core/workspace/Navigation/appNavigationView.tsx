import { useEffect, useId, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { reconcileNavigationOrder } from './appNavigation';
import type { LightningAppMetadata } from '../../metadata/Definitions/metadata';

export function resolveCurrentAppNavigation(app: LightningAppMetadata | undefined) {
  return app ? reconcileNavigationOrder(app.navigationItems ?? [], app.navigationPageApiNames ?? [], app.navigationOrder ?? []) : [];
}


/** Build identity is embedded in the served JavaScript, never inferred from current GitHub main. */
declare const __METADRIVE_WEB_RELEASE__: { commit: string | null; builtAt: string };

type OracleRelease = { commit: string; deployedAt: string };
type OracleStatus = 'idle' | 'loading' | 'ready' | 'error';

function utcDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23'
  }).format(new Date(value)) + ' UTC';
}

export function NavigationLoadTime({ routeKey, startedAt, ready, kind, authMs }: {
  routeKey: string;
  startedAt: number;
  ready: boolean;
  kind: 'login' | 'restore' | 'navigation';
  authMs: number | null;
}) {
  const [result, setResult] = useState<{ routeKey: string; milliseconds: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [oracle, setOracle] = useState<{ status: OracleStatus; release: OracleRelease | null }>({ status: 'idle', release: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

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
      {oracle.status === 'error' && <p className="navigation-diagnostics-note">Oracle API could not be reached.</p>}
      {oracle.status === 'ready' && !oracle.release && <p className="navigation-diagnostics-note">This API does not report release details yet.</p>}
    </section>}
  </div>;
}
