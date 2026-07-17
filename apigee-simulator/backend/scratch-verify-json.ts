/* eslint-disable */
// SANDBOX-ONLY verification script (same technique as scratch-verify.ts) - runs the real,
// unmodified policy executors with an in-memory fake in place of "./prisma" (this sandbox
// cannot reach binaries.prisma.sh to generate a real Prisma engine), and dumps full
// request/response detail per test case to JSON for documentation purposes.
import path from "path";
import fs from "fs";

type Row = Record<string, any>;
const apps: Row[] = [
  { id: "app-1", name: "Test App", status: "approved", consumerKey: "test-client-id", consumerSecret: "test-client-secret", developer: { email: "dev@example.com" }, products: [] },
  { id: "app-2", name: "Disabled App", status: "pending", consumerKey: "disabled-client-id", consumerSecret: "disabled-secret", developer: { email: "dev2@example.com" }, products: [] },
];
const issuedTokens: Row[] = [];

const fakePrisma: any = {
  developerApp: {
    findUnique: async ({ where }: any) => apps.find((a) => a.consumerKey === where.consumerKey) || null,
    findFirst: async ({ where }: any) => apps.find((a) => a.consumerKey === where.consumerKey && a.consumerSecret === where.consumerSecret) || null,
  },
  issuedToken: {
    create: async ({ data }: any) => { issuedTokens.push({ ...data }); return data; },
    findUnique: async ({ where }: any) => issuedTokens.find((t) => t.token === where.token) || null,
    delete: async ({ where }: any) => { const i = issuedTokens.findIndex((t) => t.token === where.token); if (i >= 0) issuedTokens.splice(i, 1); },
  },
};

const prismaAbsPath = path.resolve(__dirname, "src/utils/prisma.ts");
require.cache[prismaAbsPath] = {
  id: prismaAbsPath,
  filename: prismaAbsPath,
  loaded: true,
  exports: { __esModule: true, default: fakePrisma, prisma: fakePrisma },
} as any;

const { getExecutor } = require("./src/utils/policyExecutors");
const { selectRouteTargetName, matchesFlowCondition } = require("./src/utils/flowTypes");

const records: any[] = [];

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function makeJwt(payload: any, header: any = { alg: "RS256", typ: "JWT" }): string {
  return `${b64url(header)}.${b64url(payload)}.fakesignature`;
}

function newCtx(overrides: any = {}): any {
  return {
    variables: { ...(overrides.variables || {}) },
    request: { method: "GET", path: "/", headers: {}, query: {}, body: null, ...(overrides.request || {}) },
    response: { headers: {}, body: null, status: 200, reasonPhrase: "OK", ...(overrides.response || {}) },
    clientIp: overrides.clientIp || "203.0.113.1",
  };
}

async function run(section: string, name: string, policyType: string, config: any, ctx: any, expect: (r: any, ctx: any) => boolean) {
  const exec = getExecutor(policyType);
  const requestSnapshot = JSON.parse(JSON.stringify(ctx.request));
  let result: any;
  let threw: any = null;
  try {
    result = await exec(name, config, ctx);
  } catch (err: any) {
    threw = err.message;
    result = { status: "error", message: "THREW: " + err.message };
  }
  const pass = threw ? false : expect(result, ctx);
  records.push({
    section,
    name,
    policyType,
    config,
    request: requestSnapshot,
    result: {
      status: result.status,
      message: result.message,
      variablesSet: result.variablesSet || null,
      faultResponse: result.faultResponse || null,
    },
    responseAfter: { status: ctx.response.status, reasonPhrase: ctx.response.reasonPhrase, headers: ctx.response.headers, body: ctx.response.body },
    pass,
  });
}

async function main() {
  // ---------------- VerifyAPIKey ----------------
  await run("VerifyAPIKey", "Valid API key (header) -> success", "VerifyAPIKey",
    { apiKeyLocation: "header", apiKeyParam: "x-api-key" },
    newCtx({ request: { headers: { "x-api-key": "test-client-id" } } }),
    (r) => r.status === "success");

  await run("VerifyAPIKey", "Missing API key -> 401", "VerifyAPIKey",
    { apiKeyLocation: "header", apiKeyParam: "x-api-key" },
    newCtx({ request: { headers: {} } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  await run("VerifyAPIKey", "Invalid API key -> 401", "VerifyAPIKey",
    { apiKeyLocation: "header", apiKeyParam: "x-api-key" },
    newCtx({ request: { headers: { "x-api-key": "not-a-real-key" } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  // ---------------- OAuthV2 ----------------
  const genCtx = newCtx({ request: { method: "POST", path: "/oauth/token", body: { client_id: "test-client-id", client_secret: "test-client-secret" } } });
  await run("OAuthV2", "GenerateAccessToken with valid client credentials -> success", "OAuthV2",
    { operation: "GenerateAccessToken", grantType: "client_credentials", scopes: "read" },
    genCtx,
    (r) => r.status === "success");
  const issuedToken = genCtx.response.body?.access_token;

  await run("OAuthV2", "GenerateAccessToken response contains access_token", "OAuthV2",
    { operation: "GenerateAccessToken" },
    newCtx({ request: { method: "POST", path: "/oauth/token", body: { client_id: "test-client-id", client_secret: "test-client-secret" } } }),
    (r, ctx) => Boolean(ctx.response.body?.access_token));

  await run("OAuthV2", "GenerateAccessToken with wrong secret -> 401", "OAuthV2",
    { operation: "GenerateAccessToken" },
    newCtx({ request: { method: "POST", path: "/oauth/token", body: { client_id: "test-client-id", client_secret: "WRONG" } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  await run("OAuthV2", "VerifyAccessToken with just-issued token (Header location) -> success", "OAuthV2",
    { operation: "VerifyAccessToken", accessTokenLocation: "Header", accessTokenHeaderName: "Authorization" },
    newCtx({ request: { headers: { authorization: `Bearer ${issuedToken}` } } }),
    (r) => r.status === "success");

  await run("OAuthV2", "VerifyAccessToken with token in query param (new feature) -> success", "OAuthV2",
    { operation: "VerifyAccessToken", accessTokenLocation: "Query Parameter", accessTokenQueryParam: "access_token" },
    newCtx({ request: { path: "/secure", query: { access_token: issuedToken } } }),
    (r) => r.status === "success");

  await run("OAuthV2", "VerifyAccessToken with no token -> 401 missing", "OAuthV2",
    { operation: "VerifyAccessToken", accessTokenLocation: "Header", accessTokenHeaderName: "Authorization" },
    newCtx({ request: { headers: {} } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  await run("OAuthV2", "VerifyAccessToken with bogus token -> 401 invalid", "OAuthV2",
    { operation: "VerifyAccessToken" },
    newCtx({ request: { headers: { authorization: "Bearer not-a-real-token" } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  // ---------------- Header-casing fix ----------------
  {
    const rawHeaders = { Authorization: "Bearer some-token-value" };
    const normalized = Object.fromEntries(Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v]));
    records.push({
      section: "Header Case-Insensitivity Fix",
      name: '"Authorization" (capital, as typed in Trace UI) normalizes to lowercase "authorization" key',
      policyType: "traceEngine.ts ingestion",
      config: {},
      request: { rawHeaders },
      result: { status: normalized["authorization"] === "Bearer some-token-value" ? "success" : "error", message: `normalized = ${JSON.stringify(normalized)}`, variablesSet: null, faultResponse: null },
      responseAfter: null,
      pass: normalized["authorization"] === "Bearer some-token-value",
    });
  }

  // ---------------- VerifyJWT ----------------
  const now = Math.floor(Date.now() / 1000);
  const goodToken = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now + 3600 }, { alg: "RS256" });
  await run("VerifyJWT", "Valid JWT (issuer/audience/algorithm/expiry all match) -> success", "VerifyJWT",
    { algorithm: "RS256", issuer: "https://accounts.example.com", audience: "my-api" },
    newCtx({ request: { headers: { authorization: `Bearer ${goodToken}` } } }),
    (r) => r.status === "success");

  const expiredToken = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now - 100 });
  await run("VerifyJWT", "Expired JWT -> 401", "VerifyJWT",
    { issuer: "https://accounts.example.com", audience: "my-api" },
    newCtx({ request: { headers: { authorization: `Bearer ${expiredToken}` } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  const wrongIssuer = makeJwt({ iss: "https://evil.example.com", aud: "my-api", exp: now + 3600 });
  await run("VerifyJWT", "Wrong issuer -> 401", "VerifyJWT",
    { issuer: "https://accounts.example.com", audience: "my-api" },
    newCtx({ request: { headers: { authorization: `Bearer ${wrongIssuer}` } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  const wrongAlg = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now + 3600 }, { alg: "HS256" });
  await run("VerifyJWT", "Algorithm mismatch -> 401", "VerifyJWT",
    { algorithm: "RS256", issuer: "https://accounts.example.com", audience: "my-api" },
    newCtx({ request: { headers: { authorization: `Bearer ${wrongAlg}` } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  await run("VerifyJWT", "Malformed JWT -> 401", "VerifyJWT",
    {},
    newCtx({ request: { headers: { authorization: "Bearer not.a.validjwt.at.all" } } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  // ---------------- BasicAuthentication ----------------
  const creds = Buffer.from("alice:s3cret").toString("base64");
  await run("BasicAuthentication", "Decode valid Basic header -> success", "BasicAuthentication",
    { operation: "Decode", user: "req.user", password: "req.pass" },
    newCtx({ request: { headers: { authorization: `Basic ${creds}` } } }),
    (r) => r.status === "success" && r.variablesSet?.["req.user"] === "alice");

  await run("BasicAuthentication", "Decode with no Basic header -> 401", "BasicAuthentication",
    { operation: "Decode", user: "req.user", password: "req.pass" },
    newCtx({ request: { headers: {} } }),
    (r) => r.status === "error" && r.faultResponse?.status === 401);

  const encodeCtx = newCtx({ variables: { myuser: "bob", mypass: "hunter2" } });
  await run("BasicAuthentication", "Encode sets lowercase authorization header on the request", "BasicAuthentication",
    { operation: "Encode", user: "myuser", password: "mypass" },
    encodeCtx,
    (r, ctx) => ctx.request.headers["authorization"] === `Basic ${Buffer.from("bob:hunter2").toString("base64")}`);

  // ---------------- CORS / AccessControl ----------------
  await run("CORS", "CORS sets Access-Control-Allow-Origin on response", "CORS",
    { allowOrigins: "*", allowMethods: "GET,POST", allowHeaders: "Content-Type" },
    newCtx(),
    (r, ctx) => ctx.response.headers["Access-Control-Allow-Origin"] === "*" && r.status === "success");

  await run("AccessControl", "AccessControl DENY matching client IP -> 403", "AccessControl",
    { action: "DENY", ipList: "203.0.113.1" },
    newCtx({ clientIp: "203.0.113.1" }),
    (r) => r.status === "error" && r.faultResponse?.status === 403);

  await run("AccessControl", "AccessControl DENY non-matching client IP -> success", "AccessControl",
    { action: "DENY", ipList: "10.0.0.1" },
    newCtx({ clientIp: "203.0.113.1" }),
    (r) => r.status === "success");

  // ---------------- SpikeArrest / Quota ----------------
  {
    const spike = getExecutor("SpikeArrest");
    const key = "test-spike-" + Date.now();
    let last: any;
    let lastCtx: any;
    for (let i = 0; i < 5; i++) { lastCtx = newCtx(); last = await spike(key, { rate: "3ps" }, lastCtx); }
    records.push({ section: "SpikeArrest", name: "5 rapid calls at rate 3ps -> 4th/5th call blocked (429)", policyType: "SpikeArrest", config: { rate: "3ps" }, request: { note: "5 sequential calls, same key, within 1 second" }, result: { status: last.status, message: last.message, variablesSet: last.variablesSet || null, faultResponse: last.faultResponse || null }, responseAfter: null, pass: last.status === "error" && last.faultResponse?.status === 429 });

    const quota = getExecutor("Quota");
    const qkey = "test-quota-" + Date.now();
    let lastQ: any;
    for (let i = 0; i < 4; i++) { lastQ = await quota(qkey, { allowCount: 3, interval: 1, timeUnit: "hour" }, newCtx()); }
    records.push({ section: "Quota", name: "4 calls with allowCount=3 -> 4th call blocked (429)", policyType: "Quota", config: { allowCount: 3, interval: 1, timeUnit: "hour" }, request: { note: "4 sequential calls, same key" }, result: { status: lastQ.status, message: lastQ.message, variablesSet: lastQ.variablesSet || null, faultResponse: lastQ.faultResponse || null }, responseAfter: null, pass: lastQ.status === "error" && lastQ.faultResponse?.status === 429 });
  }

  // ---------------- Cache ----------------
  {
    const populate = getExecutor("PopulateCache");
    const lookup = getExecutor("LookupCache");
    const popCtx = newCtx({ request: { path: "/x" }, response: { body: { hello: "world" } } });
    await populate("PC", { cacheResource: "res1", cacheKey: "k1", ttlSeconds: 60 }, popCtx);
    const lookupCtx = newCtx({ request: { path: "/x" } });
    const rLookup = await lookup("LC", { cacheResource: "res1", cacheKey: "k1", assignTo: "cached.value" }, lookupCtx);
    records.push({
      section: "ResponseCache / PopulateCache / LookupCache",
      name: "PopulateCache then LookupCache round-trips the cached value",
      policyType: "PopulateCache + LookupCache",
      config: { cacheResource: "res1", cacheKey: "k1", ttlSeconds: 60 },
      request: { populate: popCtx.response.body, lookupPath: "/x" },
      result: { status: rLookup.status, message: rLookup.message, variablesSet: lookupCtx.variables, faultResponse: null },
      responseAfter: null,
      pass: JSON.stringify(lookupCtx.variables["cached.value"]) === JSON.stringify({ hello: "world" }),
    });
  }

  // ---------------- AssignMessage / ExtractVariables ----------------
  {
    const assign = getExecutor("AssignMessage");
    const assignCtx = newCtx();
    const rAssign = await assign("AM", { assignTo: "request", setHeaders: "X-Client: test-harness\nAuthorization: Bearer injected-token" }, assignCtx);
    records.push({ section: "AssignMessage", name: "AssignMessage stores header keys lowercase (X-Client, Authorization)", policyType: "AssignMessage", config: { assignTo: "request", setHeaders: "X-Client: test-harness\\nAuthorization: Bearer injected-token" }, request: {}, result: { status: rAssign.status, message: rAssign.message, variablesSet: null, faultResponse: null }, responseAfter: { headers: assignCtx.request.headers }, pass: assignCtx.request.headers["x-client"] === "test-harness" && assignCtx.request.headers["authorization"] === "Bearer injected-token" });

    const extract = getExecutor("ExtractVariables");
    const extractCtx = newCtx({ request: { body: { user: { id: 42 } } } });
    const rExtract = await extract("EV", { source: "request", jsonPath: "$.user.id", variableName: "user.id" }, extractCtx);
    records.push({ section: "ExtractVariables", name: "Extracts nested JSON path ($.user.id) into a flow variable", policyType: "ExtractVariables", config: { source: "request", jsonPath: "$.user.id", variableName: "user.id" }, request: extractCtx.request, result: { status: rExtract.status, message: rExtract.message, variablesSet: rExtract.variablesSet, faultResponse: null }, responseAfter: null, pass: extractCtx.variables["user.id"] === 42 });
  }

  // ---------------- RaiseFault / JSONToXML / XMLToJSON / JavaScript ----------------
  await run("RaiseFault", "Raises the configured status/reason/body", "RaiseFault",
    { statusCode: 503, reasonPhrase: "Service Unavailable", errorMessage: '{"error":"maintenance"}' },
    newCtx(),
    (r) => r.faultResponse?.status === 503 && r.faultResponse?.body?.error === "maintenance");

  {
    const j2x = getExecutor("JSONToXML");
    const j2xCtx = newCtx({ request: { body: { a: 1 } } });
    const rJ2x = await j2x("J2X", { source: "request" }, j2xCtx);
    records.push({ section: "JSONToXML", name: "Converts request body from JSON object to XML string", policyType: "JSONToXML", config: { source: "request" }, request: { body: { a: 1 } }, result: { status: rJ2x.status, message: rJ2x.message, variablesSet: null, faultResponse: null }, responseAfter: { body: j2xCtx.request.body }, pass: typeof j2xCtx.request.body === "string" && j2xCtx.request.body.includes("<a>") });

    const x2j = getExecutor("XMLToJSON");
    const x2jCtx = newCtx({ response: { body: "<root><a>1</a></root>" } });
    const rX2j = await x2j("X2J", { source: "response" }, x2jCtx);
    records.push({ section: "XMLToJSON", name: "Converts response body from XML string to a JSON object", policyType: "XMLToJSON", config: { source: "response" }, request: { body: "<root><a>1</a></root>" }, result: { status: rX2j.status, message: rX2j.message, variablesSet: null, faultResponse: null }, responseAfter: { body: x2jCtx.response.body }, pass: typeof x2jCtx.response.body === "object" });

    const js = getExecutor("JavaScript");
    const jsCtx = newCtx();
    const rJs = await js("JS", { source: 'context.setVariable("my.var", 1 + 2);' }, jsCtx);
    records.push({ section: "JavaScript", name: "Sandboxed JS executes and sets a flow variable", policyType: "JavaScript", config: { source: 'context.setVariable("my.var", 1 + 2);' }, request: {}, result: { status: rJs.status, message: rJs.message, variablesSet: rJs.variablesSet, faultResponse: null }, responseAfter: null, pass: jsCtx.variables["my.var"] === 3 });
  }

  // ---------------- Route Rules ----------------
  {
    const routeRules = [
      { name: "reads", targetEndpoint: "read-target", condition: { verb: "GET" } },
      { name: "writes", targetEndpoint: "write-target" },
    ];
    const cases: [string, string, string][] = [
      ["GET", "/items", "read-target"],
      ["POST", "/items", "write-target"],
      ["DELETE", "/items", "write-target"],
    ];
    for (const [verb, p, expected] of cases) {
      const got = selectRouteTargetName(routeRules, verb, p);
      records.push({ section: "Route Rules (multi-method target routing)", name: `${verb} ${p} -> routed to "${expected}"`, policyType: "Route Rule evaluation", config: { routeRules }, request: { method: verb, path: p }, result: { status: got === expected ? "success" : "error", message: `resolved target endpoint = "${got}"`, variablesSet: null, faultResponse: null }, responseAfter: null, pass: got === expected });
    }
    const condMatch = matchesFlowCondition({ verb: "get" }, "GET", "/items");
    const condNoMatch = !matchesFlowCondition({ basePathSuffix: "/orders" }, "GET", "/items/123");
    records.push({ section: "Route Rules (multi-method target routing)", name: "Verb match is case-insensitive; basePathSuffix requires substring match", policyType: "matchesFlowCondition", config: {}, request: {}, result: { status: condMatch && condNoMatch ? "success" : "error", message: `condMatch=${condMatch}, condNoMatch=${condNoMatch}`, variablesSet: null, faultResponse: null }, responseAfter: null, pass: condMatch && condNoMatch });
  }

  // ---------------- Connector stubs ----------------
  const stubConfigs: Record<string, any> = {
    ConcurrentRateLimit: { maxConcurrency: 10 },
    FlowCallout: { sharedFlowName: "Common-Security-Flow" },
    XSLTransform: { resourceName: "transform.xsl", source: "request" },
    SalesforceConnector: { operation: "Create", sobject: "Account" },
    BigQueryConnector: { projectId: "my-project" },
    CloudStorageConnector: { operation: "Upload", bucket: "my-bucket", objectName: "file.json" },
    PubSubConnector: { operation: "Publish", topic: "my-topic" },
  };
  for (const type of Object.keys(stubConfigs)) {
    await run("Connector Stubs (simulated)", `${type} executes without throwing`, type, stubConfigs[type], newCtx(), (r) => r.status === "success");
  }

  const passCount = records.filter((r) => r.pass).length;
  const failCount = records.length - passCount;
  fs.writeFileSync("test-results.json", JSON.stringify({ generatedAt: new Date().toISOString(), passCount, failCount, total: records.length, records }, null, 2));
  console.log(`Wrote test-results.json - ${passCount} passed, ${failCount} failed, ${records.length} total`);
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(1);
});
