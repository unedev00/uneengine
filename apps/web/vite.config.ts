import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.METADRIVE_API_PROXY_TARGET ?? 'http://127.0.0.1:10000';
// For local development against an existing tenant-aware API, use an explicitly
// configured registered tenant origin. Never infer tenant identity from localhost.
const configuredTenantOrigin = process.env.METADRIVE_LOCAL_TENANT_ORIGIN?.trim();
const localTenantOrigin = (() => {
  if (!configuredTenantOrigin) return null;
  const url = new URL(configuredTenantOrigin);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('METADRIVE_LOCAL_TENANT_ORIGIN must be an HTTPS origin');
  }
  return url.origin;
})();
// The custom-domain Pages deployment is rooted at /, not /metadrive/.
// Keep the project-path default for repositories without a custom domain; this repository is uneengine.
const pagesBase = process.env.GITHUB_PAGES_BASE_PATH ?? '/uneengine/';
if (pagesBase !== '/' && pagesBase !== '/uneengine/') {
  throw new Error('Unsupported GitHub Pages base path');
}

// Embed the identity of the *built frontend*, rather than the latest GitHub commit.
const frontendCommit = process.env.GITHUB_SHA ?? process.env.METADRIVE_RELEASE_SHA ?? null;
const frontendBuild = {
  commit: frontendCommit && /^[0-9a-f]{40}$/.test(frontendCommit) ? frontendCommit : null,
  builtAt: new Date().toISOString()
};

export default defineConfig({
  plugins: [react()],
  define: {
    __METADRIVE_WEB_RELEASE__: JSON.stringify(frontendBuild)
  },
  build: {
    // Multi-page build gives /acetill/ its own real document and JS entry,
    // independent of MetaDrive admin router and GitHub Pages SPA fallback.
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        login: resolve(process.cwd(), 'login/index.html'),
        acetill: resolve(process.cwd(), 'acetill/index.html')
      }
    }
  },
  base: process.env.GITHUB_PAGES === 'true' ? pagesBase : '/',
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/health': { target: apiProxyTarget },
      '/api': {
        target: apiProxyTarget,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest) => {
            if (localTenantOrigin) proxyRequest.setHeader('origin', localTenantOrigin);
            else proxyRequest.removeHeader('origin');
          });
        }
      }
    }
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
  }
});
