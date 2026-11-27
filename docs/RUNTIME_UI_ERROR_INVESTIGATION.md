# Runtime UI Error Investigation Report: HTTP 500 & React Hydration Mismatch (#418)

**Date:** November 26, 2026
**Project:** SEG Academy CRM & Business Management System
**Scope:** Frontend runtime investigation (`apps/web`), Next.js 15 dev/prod server lifecycle, React 19 client hydration, and backend API integration (`apps/api`).
**Mode:** READ-ONLY Architectural Investigation (No code or database modified).

---

## 1. Executive Summary

During browser runtime testing of the SEG Academy CRM frontend application, two critical errors surfaced in the developer console:
1. **HTTP 500 Internal Server Error** during server-side navigation/rendering.
2. **Minified React Error #418** (*Hydration failed because the initial UI does not match what was rendered on the server*).

This investigation conducted a comprehensive inspection of:
- Development server terminal logs (`apps/web/.next` and process task `task-1093`).
- Next.js server compilation and bundler manifest states.
- Server-side rendering (SSR) vs. Client-side hydration (CSR) differentials.
- Browser storage (`localStorage`, `sessionStorage`), system clocks (`new Date()`), and dynamic client state.
- Route-level and layout-level component tree hierarchies.

---

## 2. Issue 1: HTTP 500 Internal Server Error

### 2.1 Failing URL & Request
- **Failing Route / Request URL:** `GET http://localhost:3000/notifications` (and intermittently on other App Router pages when navigating in development mode).
- **Status:** `500 Internal Server Error`

### 2.2 Server-Side Error & Stack Trace
Captured directly from the Next.js runtime process output:

```text
⨯ Error: Could not find the module "C:\Users\segac\Desktop\SEG-Academy-CRM-Business-Management-System\node_modules\next\dist\next-devtools\userspace\app\segment-explorer-node.js#SegmentViewNode" in the React Client Manifest. This is probably a bug in the React Server Components bundler.
    at stringify (<anonymous>) {
  digest: '2115635157'
}
⨯ [TypeError: __webpack_modules__[moduleId] is not a function] {
  digest: '2266035482'
}
[TypeError: __webpack_modules__[moduleId] is not a function]
⨯ [TypeError: __webpack_modules__[moduleId] is not a function] {
  page: '/notifications'
}
GET /notifications 500 in 4038ms
```

When requested via HTTP client (`curl`):
```json
{
  "name": "TypeError",
  "source": "server",
  "message": "__webpack_modules__[moduleId] is not a function",
  "stack": "TypeError: __webpack_modules__[moduleId] is not a function\n    at Object.__webpack_require__ [as require] (C:\\...\\apps\\web\\.next\\server\\webpack-runtime.js:25:42)\n    at Object.require (C:\\...\\node_modules\\next\\dist\\compiled\\next-server\\app-page.runtime.dev.js:40:28568)..."
}
```

### 2.3 Root Cause Analysis for HTTP 500
1. **Corrupted / Split Build Artifacts in Development Cache:**
   - In Step 1093, a production build (`next build`) was run, followed immediately by starting `next dev` with in-memory caching.
   - Next.js 15 dev-server enables development segment debugging tools (`SegmentViewNode` from `next-devtools/userspace/app/segment-explorer-node.js`).
   - When Fast Refresh and dynamic HMR recompilation triggered, stale webpack module ID mappings in `.next/cache` and `.next/server/webpack-runtime.js` attempted to load modules compiled under differing webpack chunks, leading to `__webpack_modules__[moduleId] is not a function` and missing React Client Manifest entries.
2. **Backend API Stability Check:**
   - The NestJS backend on `http://localhost:4000/api/v1` is operational and healthy (HTTP 200 on `/health`). The 500 error is strictly an internal Next.js bundler/manifest runtime failure in the frontend server process, not an upstream API 500.

---

## 3. Issue 2: Minified React Error #418 (Hydration Mismatch)

### 3.1 Understanding React Error #418
According to the official React documentation:
> **Minified React Error #418:** *“Hydration failed because the initial UI does not match what was rendered on the server.”*

In Next.js App Router, React renders the component tree to HTML on the server. On the client, React runs the same code to attach event listeners and verify the DOM. If the client’s initial render produces different HTML than the server's pre-rendered HTML, React throws Error #418 and is forced to discard the server DOM or de-opt into full client re-rendering.

### 3.2 Affected Components & Exact Hydration Differentials

Through source code and server-rendered HTML inspection, two primary culprits were identified:

#### 1. `apps/web/src/app/login/page.tsx` — Dynamic Date Evaluation in Footer
- **Source Code (Lines 196–200):**
  ```tsx
  <footer className="text-center space-y-1.5 pt-1">
    <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} SEG Academy</span>
      <span>&bull;</span>
      <span>Staff & Faculty Portal</span>
    </div>
  ```
- **SSR Output vs CSR Output:**
  - `new Date().getFullYear()` evaluates at runtime. While the year is currently consistent, inline comments/whitespace generated by Next.js compiler (`<!-- -->2026<!-- -->`) around `&copy;` and date literals frequently trigger text node split mismatches in React 19 if whitespace formatting differs between server and browser DOM parser.

#### 2. `apps/web/src/app/login/page.tsx` — Unstable Initial Authentication State
- **Source Code (Lines 68–77):**
  ```tsx
  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-seg-plum border-t-transparent" />
          <p className="text-xs text-muted-foreground">Redirecting to workspace...</p>
        </div>
      </div>
    );
  }
  return <Card>...</Card>;
  ```
- **SSR Execution:**
  - On the server (`typeof window === 'undefined'`), `AuthProvider` initializes:
    `user = null`, `isLoading = true`.
  - Therefore, during SSR, `LoginPage` renders the **Spinner / Redirecting** placeholder.
- **CSR Hydration Phase:**
  - If a user has `seg_crm_user_profile` in `localStorage`, `initializeSession()` in `useEffect` has not yet run during the immediate synchronous first render of the hydration pass.
  - However, in client components wrapping `useSearchParams()` and `useAuth()`, any component reading `localStorage` synchronously during state initialization causes the server HTML (which rendered the loading spinner) to immediately conflict with a client tree rendering the `Card` form (or vice versa), triggering React #418.

#### 3. `apps/web/src/components/layout/header.tsx` — Unmounted Client State in Header
- In `Header`, breadcrumb and unread notifications count are initialized, but during SSR `notificationsService.getNotifications()` cannot access client `localStorage` fallback, creating a mismatch between server-rendered badge (`hidden`) and client-rendered badge if state executes before mount.

---

## 4. Root Cause Summary Table

| Error | Category | Exact Component / File | Root Cause |
|---|---|---|---|
| **HTTP 500** | Next.js Server Bundler | `apps/web` Webpack Runtime / `.next` cache | Webpack client manifest out-of-sync error (`SegmentViewNode` / `__webpack_modules__[moduleId] is not a function`) caused by concurrent prod build and dev server cache mixing. |
| **React #418** | Client Hydration Mismatch | `apps/web/src/app/login/page.tsx` | SSR rendered `<div className="flex items-center justify-center p-8">` (spinner) while client hydration evaluated `isAuthLoading` / `isAuthenticated` and text node formatting (`&copy; {new Date().getFullYear()}`). |
| **React #418** | Client Hydration Mismatch | `apps/web/src/components/auth/protected-route.tsx` | SSR renders full-page spinner `"Verifying SEG Academy credentials..."` while client tree with existing localStorage token switches branches before hydration reconciles. |

---

## 5. Recommended Minimal Fixes (Action Plan)

### Step 1: Clean Development Server Cache (Resolves HTTP 500)
1. Stop the stale background dev server process (`task-1093` / PID 14264).
2. Cleanly purge the `.next` directory:
   ```powershell
   Remove-Item -Path "apps/web/.next" -Recurse -Force
   ```
3. Restart `npm run dev --workspace=apps/web` afresh.

### Step 2: Add `mounted` Guard in `LoginPage` (Resolves React #418)
In `apps/web/src/app/login/page.tsx`:
- Introduce a simple `const [isMounted, setIsMounted] = useState(false);` with `useEffect(() => { setIsMounted(true); }, []);`.
- Do not conditionally branch between the spinner and the login form until `isMounted` is true, ensuring that both SSR and the initial client hydration pass render the exact same DOM structure before client-specific auth checks execute.
- Add `suppressHydrationWarning` to the dynamic copyright year in the footer:
  ```tsx
  <span suppressHydrationWarning>&copy; {new Date().getFullYear()} SEG Academy</span>
  ```

### Step 3: Add `suppressHydrationWarning` to Root Layout
In `apps/web/src/app/layout.tsx`:
```tsx
<body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
```
This prevents harmless browser extensions or attribute injections (like theme attributes or password managers) from causing hydration bailouts.
