# Static and single page app hosting

Each line is a question to answer with a location in the code or config, not a yes from
memory. Reference implementation: cnotv/generative-art#432.

## Unknown paths must not look like pages

- **Symptom**: analytics lists many one-off paths with small, equal counts, often company
  names (`/elanco`, `/qapital`, `/saxobank`). These are scanner probes, not visitors.
- **Cause**: the host rewrites every unknown path to `index.html` with a 200 (a
  `/*  /index.html  200` rule or its equivalent) and the client router has a catch-all
  redirect. Each probe then
  looks like a successful page view.
- **Check**: request a path that cannot exist (`/zz-no-such-page`) and read the status code.
  Anything but 404 is a finding. Look for the rewrite in the host's redirect or rewrite config (a `_redirects` file,
  `vercel.json`, `firebase.json`, a CDN rule, a bucket's error document set to
  `index.html`) and for a `*` route in the client router.

## Fix

- Pre-render every real route, then make the last rule a real 404 (in `_redirects` syntax:
  `/*  /404.html  404`). Hosts serve an existing file before rewrite rules, so pre-rendered
  routes keep working; confirm this for the host in use.
- Ship a static `404.html` with `noindex` and no third party requests, and a `robots.txt`
  that disallows it.
- Verify on the deployed preview, not only locally: the unknown path returns 404 and the real
  routes return 200. The host may 301 to a canonical form first, so follow redirects
  (`curl -sIL`) when checking.

## Optional layer: block known scanner user agents

- An edge function or middleware (Netlify Edge Functions, Cloudflare Workers, Vercel
  Middleware, CloudFront Functions) can return 403 for the user agents of scanning tools (sqlmap,
  nikto, nuclei, nmap, zgrab, masscan, gobuster, wpscan and similar). It only catches
  scanners that announce themselves; one that fakes a browser still arrives, and now gets
  the 404.
- Keep the function in a directory the linter and type checker cover, and point the host's
  config at it. A file outside the tsconfig fails `eslint .`.
- Put its test outside the functions directory when the host treats every file there as a
  function.
- Exclude heavy static files (images, fonts, bundles) from the function's route to save
  invocations.

## Limits to state in the report

- `robots.txt` only stops polite crawlers. Scanners ignore it.
- A user agent list stops only scanners that identify themselves.
- A real web application firewall (WAF) is usually a paid host or CDN feature.
- Never report bot blocking as complete; report the 404 as the fix and the rest as noise
  reduction.
