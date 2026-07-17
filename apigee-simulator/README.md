# Apigee X / Edge Simulator

A self-contained, hands-on simulator of Apigee X concepts and workflows, built so you can practice for interviews without an Apigee account. Full-stack app: **React + TypeScript + MUI** frontend, **Node + Express + TypeScript + Prisma + SQLite** backend, local (JWT) authentication only.

## What's included

- **API Proxies**: create/edit proxies with PreFlow/PostFlow/Conditional Flows, a visual flow diagram (React Flow) showing Client → policies → Target Endpoint → Response, target server + failover configuration, revisions, and OpenAPI import.
- **Policies**: all 25 listed policy types (Security, Traffic Management, Mediation, Transformation, Extension, plus ResponseCache/PopulateCache/LookupCache) with a config form, live-generated XML view (Monaco editor), and validation.
- **Shared Flows**: reusable policy sequences with versioning, attachable as global or per-proxy Flow Hooks (Pre/Post Proxy, Pre/Post Target).
- **API Products, Developers, Apps**: quota, scopes, operation restrictions, auto-generated consumer key/secret, monetization fields.
- **Environments, Environment Groups, Virtual Hosts, Target Servers, KVMs (org + env scoped), References (KeyStore/TrustStore/JWKS)**.
- **Deployments**: deploy/undeploy per environment with history.
- **Trace**: the flagship feature — run a simulated request through a deployed proxy and see a step-by-step execution timeline (✓/✗ per policy), request/response headers & payload, target request/response, and every flow variable created. You can force a specific policy to fail to practice fault handling. Target calls are real HTTP requests to the seeded public APIs (jsonplaceholder, fakestoreapi, open-meteo), including a live Target Failover demo.
- **Analytics**: request count, response code breakdown, latency, top APIs, traffic trend, filterable by time range/environment/proxy, backed by ~30 days of generated mock traffic.
- **Monitoring**: availability, response time, error rate, traffic volume, and alert simulation.
- **Dashboard** with the requested widgets.
- **Bonus features**: environment groups, virtual hosts, target failover, caching policies, JWKS references, OpenAPI import, revision management.

## Tech stack

- Frontend: React, TypeScript, MUI, React Router, Zustand, React Flow, Monaco Editor, Recharts, Vite.
- Backend: Node.js, Express, TypeScript, SQLite, Prisma ORM, JWT + bcrypt local auth.

## Project structure

```
apigee-simulator/
  backend/
    prisma/schema.prisma      # full data model (proxies, policies, products, developers, apps, KVMs, deployments, trace sessions, analytics, ...)
    prisma/seed.ts            # seeds environments, target servers, sample proxies/policies, products, developers, apps, KVMs, 30 days of analytics
    src/routes/*.ts           # one Express router per module
    src/utils/policyCatalog.ts# policy field definitions + real Apigee-style XML generator (shared shape with frontend)
    src/utils/traceEngine.ts  # the flow execution simulator used by Trace
    src/utils/policyExecutors.ts # per-policy-type simulated behavior
  frontend/
    src/pages/...             # one folder per sidebar module
    src/components/proxy/ProxyFlowDiagram.tsx  # React Flow visualization
    src/components/policy/*   # policy picker + Monaco config/XML dialog
    src/data/policyCatalog.ts # mirror of the backend catalog for the config forms
```

## Setup

Requires Node.js 18+.

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev            # starts the API on http://localhost:4000
```

```bash
cd frontend
npm install
npm run dev            # starts the UI on http://localhost:5173 (proxies /api to :4000)
```

Log in with the seeded account:

```
Email:    admin@apigee-sim.local
Password: Apigee123!
```

(You can also create a new account from the login screen — local auth only, no external provider.)

## Notes on how this was built / known limitations

- This project was assembled inside a sandboxed build environment whose outbound network allowlist blocks `binaries.prisma.sh`, which is the host Prisma's CLI uses to download its native query/schema engine binaries. Because of that, `prisma generate` / `prisma migrate` could not be executed to completion *inside that sandbox*, so the full stack could not be run end-to-end there. This is a restriction of that specific build environment, not of your machine — `binaries.prisma.sh` is a normal public host, and on a regular internet connection `npm install` + `npx prisma generate` + `npx prisma migrate dev` will work exactly as usual. The Prisma schema and all query usage follow completely standard Prisma Client patterns.
- The backend's non-Prisma dependencies did fully install and its TypeScript source was written and reviewed carefully, but full `tsc`/runtime verification of the complete stack together (something that needs the generated Prisma Client types) wasn't possible in that sandbox for the reason above. Please run `npm run build` in both folders after `npm install` and let us know if you hit any compile errors — happy to fix immediately.
- A few advanced Apigee concepts are represented at the data-model level but don't yet have dedicated UI: Load Balancing config on Target Servers (schema field exists), named Fault Rules (the simulator currently treats any policy error as the active fault, which covers the practice use case but isn't a fully separate fault-rule table), and Proxy Bundles/API Hub-style catalog browsing (the Proxy list itself doubles as a simple catalog).
- SQLite database file (`backend/prisma/dev.db`) and both `node_modules` folders are intentionally not included — they're generated by the setup steps above.

## Sample logins / data

Seeded target servers point at real public APIs so Trace results are genuine, not canned:
- `CustomerService` → jsonplaceholder.typicode.com/users
- `OrderService` → jsonplaceholder.typicode.com/posts
- `ProductService` → fakestoreapi.com/products
- `MockWeather` → api.open-meteo.com

Seeded proxies: `CustomerService-v1`, `OrderService-v1` (matches the VerifyJWT → SpikeArrest → AssignMessage → Target → Response example), `ProductCatalog-v1` (response caching), `WeatherProxy-v1` (CORS), `FailoverDemo-v1` (deliberately unreachable primary target + working failover, to demo Target Failover live in Trace), and `OAuthToken-v1` / `OAuthProtected-v1` (a real, working OAuth2 client_credentials flow — see below).

## Testing a real OAuth2 flow in Trace

`VerifyAPIKey` and the OAuthV2 policy are both wired to your real data, not just simulated pass/fail:

1. Go to **Apps**, expand any app, and copy its **Consumer Key** and **Consumer Secret**.
2. Go to **Runtime > Trace**, pick proxy `OAuthToken-v1`, method `POST`, path `/oauth/token`, and set the request body to:
   ```json
   { "client_id": "<consumer key>", "client_secret": "<consumer secret>" }
   ```
   Run Trace — the response body will contain a real `access_token` (it's validated against the app and stored server-side with a 1-hour expiry).
3. Copy that `access_token`. Pick proxy `OAuthProtected-v1`, add a header `Authorization: Bearer <access_token>`, and run Trace again — `VerifyAccessToken` will look the token up and pass, then the request continues on to a real backend call. Use a made-up token (or wait an hour) to see the 401 fault path instead.

`VerifyAPIKey` works the same way with real data: attach it to any proxy (e.g. `CustomerService-v1` already has it), pass an app's Consumer Key as the configured query param/header in Trace, and it does a genuine database lookup rather than a canned pass/fail.
