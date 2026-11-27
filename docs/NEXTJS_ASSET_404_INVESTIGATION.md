# Investigation Report: Next.js Frontend Asset 404 Errors

**Date:** November 26, 2026
**Project:** SEG Academy CRM & Business Management System (`apps/web`)
**Scope:** Browser Network Tab 404s, Next.js Asset Resolution, `.next` Build Directory Integrity, Dev Server vs Production Build Clashes.
**Mode:** READ-ONLY Investigation (No code, configurations, database, or migrations modified).

---

## 1. Executive Summary

Browser console reports showed the following static assets returning **404 Not Found**:
- `/_next/static/chunks/main-app.js` (404)
- `/_next/static/chunks/app-pages-internals.js` (404)
- `/_next/static/chunks/app/not-found.js` (404)
- `/_next/static/css/app/layout.css` (404)

Our forensic inspection of the running server processes, `.next` directory structure, generated HTML tags, and network layer revealed:

**The root cause is a collision between an active Next.js development server process and a subsequent production build (`next build`) sharing the same `apps/web/.next` directory.**

Specifically:
1. When `next dev` initially compiles a page, it serves development HTML referencing unhashed asset paths (e.g., `/_next/static/chunks/main-app.js?v=...`, `/_next/static/chunks/app-pages-internals.js`, `/_next/static/css/app/layout.css?v=...`).
2. Later, when `npm run build` (`next build`) was executed in the workspace to verify production readiness, Next.js cleaned/overwrote `apps/web/.next` and replaced all static chunks with production-hashed filenames (e.g., `main-app-9e34b4d2b26e27fd.js`, `0a61cf8717926e2a.css`, `hn51qr3PtPNGZIkP426rj/_buildManifest.js`).
3. Meanwhile, the long-running development server process (`task-2249`, PID `12852`) remained active in memory on port 3000. It continued serving in-memory cached development HTML pointing to the unhashed development asset URLs.
4. When the browser (or an HTTP client) requested those development asset URLs, the static file handler looked on disk in `apps/web/.next/static/...`. Because the production build had replaced development assets with production-hashed files, the server returned `404 Not Found`.

---

## 2. Detailed Findings by Check Item

### 2.1 Exact Failed Asset URLs
The failed requests reported in the browser console match:
- `http://localhost:3000/_next/static/chunks/main-app.js?v=1795681272438`
- `http://localhost:3000/_next/static/chunks/app-pages-internals.js`
- `http://localhost:3000/_next/static/chunks/app/not-found.js`
- `http://localhost:3000/_next/static/css/app/layout.css?v=1795681272438`
- `http://localhost:3000/_next/static/chunks/app/login/page.js`

### 2.2 Verification Against Current `apps/web/.next` Output
Direct inspection of `apps/web/.next/static` confirms:
- **Unhashed files DO NOT EXIST on disk:**
  - `apps/web/.next/static/chunks/main-app.js` $\rightarrow$ **Missing**
  - `apps/web/.next/static/chunks/app-pages-internals.js` $\rightarrow$ **Missing**
  - `apps/web/.next/static/css/app/layout.css` $\rightarrow$ **Missing**
- **Production-hashed files DO EXIST on disk:**
  - `apps/web/.next/static/chunks/main-app-9e34b4d2b26e27fd.js` $\rightarrow$ **Exists** (`curl` returns `200 OK`, `555 bytes`)
  - `apps/web/.next/static/css/0a61cf8717926e2a.css` $\rightarrow$ **Exists** (`curl` returns `200 OK`, `47,294 bytes`)
  - `apps/web/.next/static/hn51qr3PtPNGZIkP426rj/_buildManifest.js` $\rightarrow$ **Exists** (`curl` returns `200 OK`, `2,008 bytes`)
  - `apps/web/.next/BUILD_ID` = `hn51qr3PtPNGZIkP426rj`

### 2.3 HTML Response Inspection
Inspecting the HTML returned by `GET http://localhost:3000/login`:
```html
<link rel="stylesheet" href="/_next/static/css/app/layout.css?v=1795681272438" data-precedence="next_static/css/app/layout.css"/>
<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack.js?v=1795681272438"/>
<script src="/_next/static/chunks/main-app.js?v=1795681272438" async=""></script>
<script src="/_next/static/chunks/app-pages-internals.js" async=""></script>
<script src="/_next/static/chunks/app/layout.js" async=""></script>
<script src="/_next/static/chunks/app/not-found.js" async=""></script>
<script src="/_next/static/chunks/app/login/page.js" async=""></script>
```
The server is emitting HTML referencing **development asset filenames**, while the physical disk holds **production build artifacts**.

### 2.4 Next.js Configuration Check
Inspection of `apps/web/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@seg/types'],
};

export default nextConfig;
```
Inspection of `apps/web/.next/required-server-files.json`:
- `assetPrefix`: `""` (Default, no CDN prefix)
- `basePath`: `""` (Default, root `/`)
- `distDir`: `".next"` (Default)

There is no custom `assetPrefix` or `basePath` misconfiguration.

### 2.5 Dev Server vs Production Build Collision
- **Process PID 12852**: Running `next dev --port 3000` started as `task-2249`.
- During verification in the prior turn, `npm.cmd run build --workspace=apps/web` was executed while PID 12852 was still bound to port 3000.
- `next build` executed `cleanDistDir: true`, wiping out the development chunks and writing production-hashed chunks, leaving the dev server serving stale dev HTML while its static route handler points to production assets.

### 2.6 Browser Cache & Service Worker Check
- There are no Service Workers registered in `apps/web`.
- However, standard browser HTTP caching retains the dev HTML if navigation occurred during the build transition. When the browser requests the development chunk URLs (`main-app.js`, `layout.css`), the server has no files on disk matching those names.

### 2.7 Chunk Availability Summary
| Requested URL | Disk File Status | HTTP Status |
|---|---|---|
| `/_next/static/chunks/main-app.js` | Missing (Dev chunk wiped by prod build) | **404 Not Found** |
| `/_next/static/chunks/app-pages-internals.js` | Missing (Dev chunk wiped by prod build) | **404 Not Found** |
| `/_next/static/chunks/app/not-found.js` | Missing (Dev chunk wiped by prod build) | **404 Not Found** |
| `/_next/static/css/app/layout.css` | Missing (Dev chunk wiped by prod build) | **404 Not Found** |
| `/_next/static/chunks/main-app-9e34b4d2b26e27fd.js` | Present on disk (Production chunk) | **200 OK** |
| `/_next/static/css/0a61cf8717926e2a.css` | Present on disk (Production chunk) | **200 OK** |

---

## 3. Root Cause Statement

The 404 errors on `main-app.js`, `app-pages-internals.js`, `not-found.js`, and `layout.css` are caused by **state divergence between the in-memory development server and the file system**:
1. Next.js development server (`next dev`) and production build (`next build`) share the same output directory (`apps/web/.next`).
2. Running `next build` while `next dev` is running overwrites development assets with production-hashed bundles without restarting or updating the running dev server.
3. The running dev server continues to emit HTML containing development asset paths that no longer exist on disk.

---

## 4. Minimal Recommended Fix

To resolve this issue cleanly without altering code or configuration:

1. **Terminate the existing background process on port 3000 (PID 12852 / `task-2249`)**:
   ```powershell
   Stop-Process -Id 12852 -Force
   ```
2. **Purge the hybrid/collided `.next` directory**:
   ```powershell
   Remove-Item -Path "apps/web/.next" -Recurse -Force
   ```
3. **Choose the single intended mode of operation**:
   - **For Development Mode**:
     Start `npm run dev --workspace=apps/web`. The dev server will generate and serve only development assets (`main-app.js`, `layout.css`, etc.) with zero 404s.
   - **For Production Mode**:
     Run `npm run build --workspace=apps/web` followed by `npm run start --workspace=apps/web`. Next.js will emit and serve production-hashed assets matching the HTML.
4. **Best-Practice Monorepo Recommendation**:
   Avoid running `npm run build` concurrently with an active `npm run dev` server in the same workspace directory. If build verification is needed, stop the dev server, build, and then start either `start` or re-launch `dev`.
