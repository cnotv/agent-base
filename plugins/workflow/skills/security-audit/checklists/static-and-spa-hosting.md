# Static and single page app hosting

Each line is a question to answer with a location in the code or config, not a yes from
memory. Reference implementation: cnotv/generative-art#432.

## Unknown paths must not look like pages

- **Symptom**: analytics lists many one-off paths with small, equal counts, often company
  names (`/elanco`, `/qapital`, `/saxobank`). These are scanner probes, not visitors.
- **Cause**: the host rewrites every unknown path to `index.html` with a 200 (Netlify
  `/*  /index.html  200`) and the client router has a catch-all redirect. Each probe then
  looks like a successful page view.
- **Check**: request a path that cannot exist (`/zz-no-such-page`) and read the status code.
  Anything but 404 is a finding. Look for the rewrite in `_redirects`, `netlify.toml`,
  `vercel.json` or the host's equivalent, and for a `*` route in the client router.

## Fix

- Pre-render every real route, then make the last rule a real 404:
  `/*  /404.html  404`. Hosts serve an existing file before redirect rules, so pre-rendered
  routes keep working.
- Ship a static `404.html` with `noindex` and no third party requests, and a `robots.txt`
  that disallows it.
- Verify on the deploy preview, not only locally: the unknown path returns 404 and the real
  routes return 200. The host may 301 to a canonical form first, so follow redirects
  (`curl -sIL`) when checking.

## Optional layer: block known scanner user agents

- A Netlify Edge Function can return 403 for the user agents of scanning tools (sqlmap,
  nikto, nuclei, nmap, zgrab, masscan, gobuster, wpscan and similar). It only catches
  scanners that announce themselves; one that fakes a browser still arrives, and now gets
  the 404.
- Keep the function in a directory the linter and type checker cover, and point
  `netlify.toml` `edge_functions` at it. A file outside the tsconfig fails `eslint .`.
- Put its test outside the functions directory: every top level file there is treated as a
  function.
- Exclude heavy static files with `excludedPath` to save invocations.

## Limits to state in the report

- `robots.txt` only stops polite crawlers. Scanners ignore it.
- A user agent list stops only scanners that identify themselves.
- A real web application firewall (WAF) needs a paid host plan.
- Never report bot blocking as complete; report the 404 as the fix and the rest as noise
  reduction.
