// Temporary scenario test script - runs the REAL traceEngine.ts against the
// fixture prisma shim (src/utils/prisma.ts, temporarily swapped). Not part of
// the shipped project.
import { runTrace } from "./src/utils/traceEngine";

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(payload: any): string {
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const body = b64url(payload);
  return `${header}.${body}.dummysignature`;
}

let passCount = 0;
let failCount = 0;

function report(scenario: string, expectation: string, ok: boolean, extra?: any) {
  console.log(`\n${"=".repeat(90)}`);
  console.log(`SCENARIO: ${scenario}`);
  console.log(`EXPECTED: ${expectation}`);
  console.log(`RESULT:   ${ok ? "PASS ✓" : "FAIL ✗"}`);
  if (extra) console.log(JSON.stringify(extra, null, 2));
  if (ok) passCount++;
  else failCount++;
}

async function main() {
  // ------------------------------------------------------------------ 1
  {
    const r = await runTrace({
      proxyName: "CustomerService-v1",
      environmentName: "test",
      method: "GET",
      path: "/customers",
      headers: {},
      query: { apikey: "test-consumer-key-abc123" },
      body: null,
    });
    report("VerifyAPIKey with a VALID consumer key (real DeveloperApp lookup)", "success=true, real jsonplaceholder /users data in response, VerifyAPIKey step = success", r.success === true, {
      success: r.success,
      responseStatus: r.response.status,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} (${t.type}) - ${t.message}`),
      variables: r.variables,
      responseBodySample: Array.isArray(r.response.body) ? r.response.body.slice(0, 1) : r.response.body,
    });
  }

  // ------------------------------------------------------------------ 2
  {
    const r = await runTrace({
      proxyName: "CustomerService-v1",
      environmentName: "test",
      method: "GET",
      path: "/customers",
      headers: {},
      query: { apikey: "this-key-does-not-exist" },
      body: null,
    });
    report("VerifyAPIKey with an INVALID consumer key", "success=false, 401 fault, target call skipped", r.success === false && r.response.status === 401, {
      success: r.success,
      responseStatus: r.response.status,
      responseBody: r.response.body,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 3
  {
    const validJwt = makeJwt({ sub: "user-123", iss: "https://accounts.example.com", aud: "my-api", exp: Math.floor(Date.now() / 1000) + 3600 });
    const r = await runTrace({
      proxyName: "OrderService-v1",
      environmentName: "test",
      method: "GET",
      path: "/orders",
      headers: { authorization: `Bearer ${validJwt}` },
      query: {},
      body: null,
    });
    report(
      "Full chain: VerifyJWT (valid, unexpired) -> SpikeArrest -> Quota -> AssignMessage -> real target call (jsonplaceholder /posts)",
      "success=true, every step ✓, real posts array returned, request header X-Client added",
      r.success === true,
      {
        success: r.success,
        responseStatus: r.response.status,
        timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} (${t.type}) - ${t.message} [${t.durationMs}ms]`),
        variables: r.variables,
        responseBodySample: Array.isArray(r.response.body) ? r.response.body.slice(0, 1) : r.response.body,
      }
    );
  }

  // ------------------------------------------------------------------ 4
  {
    const expiredJwt = makeJwt({ sub: "user-123", exp: Math.floor(Date.now() / 1000) - 3600 });
    const r = await runTrace({
      proxyName: "OrderService-v1",
      environmentName: "test",
      method: "GET",
      path: "/orders",
      headers: { authorization: `Bearer ${expiredJwt}` },
      query: {},
      body: null,
    });
    report("VerifyJWT with an EXPIRED token", "success=false, 401 'JWT has expired', SpikeArrest/Quota/target all skipped", r.success === false && r.response.status === 401, {
      success: r.success,
      responseStatus: r.response.status,
      responseBody: r.response.body,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 5 (OAuth: issue token)
  let issuedToken = "";
  {
    const r = await runTrace({
      proxyName: "OAuthToken-v1",
      environmentName: "test",
      method: "POST",
      path: "/oauth/token",
      headers: {},
      query: {},
      body: { client_id: "test-consumer-key-abc123", client_secret: "test-consumer-secret-xyz789" },
    });
    issuedToken = r.response.body?.access_token || "";
    report("OAuthV2 GenerateAccessToken with VALID client_id/client_secret (real DeveloperApp match)", "success=true, real access_token issued and stored server-side, target call skipped", r.success === true && Boolean(issuedToken), {
      success: r.success,
      responseStatus: r.response.status,
      responseBody: r.response.body,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 6 (OAuth: verify real token)
  {
    const r = await runTrace({
      proxyName: "OAuthProtected-v1",
      environmentName: "test",
      method: "GET",
      path: "/secure",
      headers: { authorization: `Bearer ${issuedToken}` },
      query: {},
      body: null,
    });
    report("OAuthV2 VerifyAccessToken with the token minted in scenario 5", "success=true, token looked up and found valid, real target call proceeds", r.success === true, {
      success: r.success,
      responseStatus: r.response.status,
      variables: r.variables,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 7 (OAuth: bogus token)
  {
    const r = await runTrace({
      proxyName: "OAuthProtected-v1",
      environmentName: "test",
      method: "GET",
      path: "/secure",
      headers: { authorization: "Bearer this-token-was-never-issued" },
      query: {},
      body: null,
    });
    report("OAuthV2 VerifyAccessToken with a BOGUS token", "success=false, 401 invalid_access_token fault", r.success === false && r.response.status === 401, {
      success: r.success,
      responseStatus: r.response.status,
      responseBody: r.response.body,
    });
  }

  // ------------------------------------------------------------------ 8 (ResponseCache)
  {
    const r1 = await runTrace({ proxyName: "ProductCatalog-v1", environmentName: "test", method: "GET", path: "/products", headers: { "x-api-key": "test-consumer-key-def456" }, query: {}, body: null });
    const r2 = await runTrace({ proxyName: "ProductCatalog-v1", environmentName: "test", method: "GET", path: "/products", headers: { "x-api-key": "test-consumer-key-def456" }, query: {}, body: null });
    const firstWasMiss = r1.variables["responsecache.cachehit"] === false;
    const secondWasHit = r2.variables["responsecache.cachehit"] === true;
    report("ResponseCache: 1st call is a cache MISS (real target call), 2nd identical call is a cache HIT (target call skipped)", "1st cachehit=false, 2nd cachehit=true", firstWasMiss && secondWasHit, {
      firstCallCacheHit: r1.variables["responsecache.cachehit"],
      secondCallCacheHit: r2.variables["responsecache.cachehit"],
      secondCallTimeline: r2.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 9 (Target failover)
  {
    const r = await runTrace({ proxyName: "FailoverDemo-v1", environmentName: "test", method: "GET", path: "/failover-demo", headers: {}, query: {}, body: null });
    const failedOver = r.timeline.some((t: any) => t.type === "HTTP Call (Failover)" && t.status === "success");
    report("Target Failover: primary target is an unreachable host, should fail over to ProductService and still succeed", "success=true, timeline shows failover HTTP call", r.success === true && failedOver, {
      success: r.success,
      responseStatus: r.response.status,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.phase} :: ${t.name} (${t.type}) - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 10 (RaiseFault)
  {
    const r = await runTrace({ proxyName: "RaiseFaultDemo-v1", environmentName: "test", method: "GET", path: "/fault-demo", headers: {}, query: {}, body: null });
    report("RaiseFault policy unconditionally raises a 400 fault", "success=false, status 400, target call never attempted", r.success === false && r.response.status === 400, {
      success: r.success,
      responseStatus: r.response.status,
      responseBody: r.response.body,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.name} - ${t.message}`),
    });
  }

  // ------------------------------------------------------------------ 11 (simulateFault)
  {
    const validJwt = makeJwt({ sub: "user-123", exp: Math.floor(Date.now() / 1000) + 3600 });
    const r = await runTrace({
      proxyName: "OrderService-v1",
      environmentName: "test",
      method: "GET",
      path: "/orders",
      headers: { authorization: `Bearer ${validJwt}` },
      query: {},
      body: null,
      simulateFault: "SpikeArrest",
    });
    report("Manual 'Simulate Fault' on the SpikeArrest step (practice tool), even though the real request would have passed", "success=false, SpikeArrest step forced to error, Quota/AssignMessage/target skipped", r.success === false, {
      success: r.success,
      timeline: r.timeline.map((t: any) => `${t.status === "success" ? "✓" : t.status === "error" ? "✗" : "–"} ${t.name} - ${t.message}`),
    });
  }

  console.log(`\n${"=".repeat(90)}`);
  console.log(`TOTAL: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} scenarios`);
}

main().catch((e) => {
  console.error("HARNESS CRASHED:", e);
  process.exit(1);
});
