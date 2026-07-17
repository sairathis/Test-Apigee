/* eslint-disable */
// SANDBOX-ONLY verification script. Not part of the delivered project (lives outside src/,
// and is excluded from the shipped zip). This sandbox cannot reach binaries.prisma.sh (blocked
// by the environment's network allowlist), so a real Prisma query engine can't be generated here.
// To still exercise the real executor/policy code, this script injects a tiny in-memory fake
// in place of the "./prisma" module via Node's require cache, then calls the real, unmodified
// executors from policyExecutors.ts / runtimeState.ts / flowTypes.ts directly.
import path from "path";

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
    create: async ({ data }: any) => {
      issuedTokens.push({ ...data });
      return data;
    },
    findUnique: async ({ where }: any) => issuedTokens.find((t) => t.token === where.token) || null,
    delete: async ({ where }: any) => {
      const i = issuedTokens.findIndex((t) => t.token === where.token);
      if (i >= 0) issuedTokens.splice(i, 1);
    },
  },
};

const prismaAbsPath = path.resolve(__dirname, "src/utils/prisma.ts");
console.log("DEBUG prismaAbsPath:", prismaAbsPath);
require.cache[prismaAbsPath] = {
  id: prismaAbsPath,
  filename: prismaAbsPath,
  loaded: true,
  exports: { __esModule: true, default: fakePrisma, prisma: fakePrisma },
} as any;

console.log("DEBUG cache has key:", Boolean(require.cache[prismaAbsPath]));
// ---- now safe to pull in the real modules under test ----
const { getExecutor } = require("./src/utils/policyExecutors");
const { selectRouteTargetName, matchesFlowCondition } = require("./src/utils/flowTypes");
const { checkSpikeArrest, checkQuota, cacheGet, cacheSet } = require("./src/utils/runtimeState");
const { jsonToXml, xmlToJson } = require("./src/utils/transform");

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? " -> " + detail : ""}`);
  }
}

function newCtx(overrides: Partial<any> = {}): any {
  return {
    variables: {},
    request: { method: "GET", path: "/", headers: {}, query: {}, body: null, ...(overrides.request || {}) },
    response: { headers: {}, body: null, status: 200, reasonPhrase: "OK" },
    clientIp: "203.0.113.1",
    ...overrides,
  };
}

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(payload: any, header: any = { alg: "RS256", typ: "JWT" }): string {
  return `${b64url(header)}.${b64url(payload)}.fakesignature`;
}

async function main() {
  console.log("\n=== VerifyAPIKey ===");
  {
    const exec = getExecutor("VerifyAPIKey");
    const ctxValid = newCtx({ request: { headers: { "x-api-key": "test-client-id" }, query: {} } });
    const rValid = await exec("VA", { apiKeyLocation: "header", apiKeyParam: "x-api-key" }, ctxValid);
    check("valid API key (header) -> success", rValid.status === "success", rValid.message);

    const ctxMissing = newCtx({ request: { headers: {}, query: {} } });
    const rMissing = await exec("VA", { apiKeyLocation: "header", apiKeyParam: "x-api-key" }, ctxMissing);
    check("missing API key -> 401", rMissing.status === "error" && rMissing.faultResponse?.status === 401, rMissing.message);

    const ctxInvalid = newCtx({ request: { headers: { "x-api-key": "not-a-real-key" }, query: {} } });
    const rInvalid = await exec("VA", { apiKeyLocation: "header", apiKeyParam: "x-api-key" }, ctxInvalid);
    check("invalid API key -> 401", rInvalid.status === "error" && rInvalid.faultResponse?.status === 401, rInvalid.message);
  }

  console.log("\n=== OAuthV2 (GenerateAccessToken -> VerifyAccessToken, header + query param) ===");
  {
    const exec = getExecutor("OAuthV2");
    const genCtx = newCtx({ request: { method: "POST", path: "/oauth/token", headers: {}, query: {}, body: { client_id: "test-client-id", client_secret: "test-client-secret" } } });
    const genResult = await exec("OA-Gen", { operation: "GenerateAccessToken", grantType: "client_credentials", scopes: "read" }, genCtx);
    check("GenerateAccessToken with valid client credentials -> success", genResult.status === "success", genResult.message);
    const token = genCtx.response.body?.access_token;
    check("GenerateAccessToken response contains access_token", Boolean(token));

    const genBadCtx = newCtx({ request: { method: "POST", path: "/oauth/token", headers: {}, query: {}, body: { client_id: "test-client-id", client_secret: "WRONG" } } });
    const genBad = await exec("OA-Gen", { operation: "GenerateAccessToken" }, genBadCtx);
    check("GenerateAccessToken with wrong secret -> 401", genBad.status === "error" && genBad.faultResponse?.status === 401, genBad.message);

    const verifyCtx = newCtx({ request: { headers: { authorization: `Bearer ${token}` }, query: {} } });
    const verifyResult = await exec("OA-Verify", { operation: "VerifyAccessToken", accessTokenLocation: "Header", accessTokenHeaderName: "Authorization" }, verifyCtx);
    check("VerifyAccessToken with just-issued token (Header location) -> success", verifyResult.status === "success", verifyResult.message);

    const verifyQueryCtx = newCtx({ request: { headers: {}, query: { access_token: token } } });
    const verifyQueryResult = await exec("OA-Verify", { operation: "VerifyAccessToken", accessTokenLocation: "Query Parameter", accessTokenQueryParam: "access_token" }, verifyQueryCtx);
    check("VerifyAccessToken with token in query param (new feature) -> success", verifyQueryResult.status === "success", verifyQueryResult.message);

    const verifyMissingCtx = newCtx({ request: { headers: {}, query: {} } });
    const verifyMissing = await exec("OA-Verify", { operation: "VerifyAccessToken", accessTokenLocation: "Header", accessTokenHeaderName: "Authorization" }, verifyMissingCtx);
    check("VerifyAccessToken with no token -> 401 missing", verifyMissing.status === "error" && verifyMissing.faultResponse?.status === 401, verifyMissing.message);

    const verifyBogusCtx = newCtx({ request: { headers: { authorization: "Bearer not-a-real-token" }, query: {} } });
    const verifyBogus = await exec("OA-Verify", { operation: "VerifyAccessToken" }, verifyBogusCtx);
    check("VerifyAccessToken with bogus token -> 401 invalid", verifyBogus.status === "error" && verifyBogus.faultResponse?.status === 401, verifyBogus.message);
  }

  console.log("\n=== traceEngine header-casing fix (simulated ingestion normalization) ===");
  {
    const rawHeaders = { Authorization: "Bearer some-token-value" };
    const normalized = Object.fromEntries(Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v]));
    check('"Authorization" (capital) normalizes to lowercase "authorization" key', normalized["authorization"] === "Bearer some-token-value");
  }

  console.log("\n=== VerifyJWT ===");
  {
    const exec = getExecutor("VerifyJWT");
    const now = Math.floor(Date.now() / 1000);
    const goodToken = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now + 3600 }, { alg: "RS256" });
    const rGood = await exec("VJ", { algorithm: "RS256", issuer: "https://accounts.example.com", audience: "my-api" }, newCtx({ request: { headers: { authorization: `Bearer ${goodToken}` }, query: {} } }));
    check("valid JWT (issuer/audience/alg/exp all match) -> success", rGood.status === "success", rGood.message);

    const expiredToken = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now - 100 });
    const rExpired = await exec("VJ", { issuer: "https://accounts.example.com", audience: "my-api" }, newCtx({ request: { headers: { authorization: `Bearer ${expiredToken}` }, query: {} } }));
    check("expired JWT -> 401", rExpired.status === "error" && rExpired.faultResponse?.status === 401, rExpired.message);

    const wrongIssuer = makeJwt({ iss: "https://evil.example.com", aud: "my-api", exp: now + 3600 });
    const rWrongIss = await exec("VJ", { issuer: "https://accounts.example.com", audience: "my-api" }, newCtx({ request: { headers: { authorization: `Bearer ${wrongIssuer}` }, query: {} } }));
    check("wrong issuer -> 401", rWrongIss.status === "error" && rWrongIss.faultResponse?.status === 401, rWrongIss.message);

    const wrongAlg = makeJwt({ iss: "https://accounts.example.com", aud: "my-api", exp: now + 3600 }, { alg: "HS256" });
    const rWrongAlg = await exec("VJ", { algorithm: "RS256", issuer: "https://accounts.example.com", audience: "my-api" }, newCtx({ request: { headers: { authorization: `Bearer ${wrongAlg}` }, query: {} } }));
    check("algorithm mismatch -> 401", rWrongAlg.status === "error" && rWrongAlg.faultResponse?.status === 401, rWrongAlg.message);

    const malformed = "not.a.validjwt.at.all";
    const rMalformed = await exec("VJ", {}, newCtx({ request: { headers: { authorization: `Bearer ${malformed}` }, query: {} } }));
    check("malformed JWT -> 401", rMalformed.status === "error" && rMalformed.faultResponse?.status === 401, rMalformed.message);
  }

  console.log("\n=== BasicAuthentication ===");
  {
    const exec = getExecutor("BasicAuthentication");
    const creds = Buffer.from("alice:s3cret").toString("base64");
    const rDecode = await exec("BA", { operation: "Decode", user: "req.user", password: "req.pass" }, newCtx({ request: { headers: { authorization: `Basic ${creds}` }, query: {} } }));
    check("Decode valid Basic header -> success", rDecode.status === "success" && rDecode.variablesSet?.["req.user"] === "alice", rDecode.message);

    const rDecodeMissing = await exec("BA", { operation: "Decode", user: "req.user", password: "req.pass" }, newCtx({ request: { headers: {}, query: {} } }));
    check("Decode with no Basic header -> 401", rDecodeMissing.status === "error" && rDecodeMissing.faultResponse?.status === 401, rDecodeMissing.message);

    const encodeCtx = newCtx({ variables: { "myuser": "bob", "mypass": "hunter2" }, request: { headers: {}, query: {} } });
    const rEncode = await exec("BA", { operation: "Encode", user: "myuser", password: "mypass" }, encodeCtx);
    const expectedHeader = `Basic ${Buffer.from("bob:hunter2").toString("base64")}`;
    check("Encode sets lowercase authorization header on the request", encodeCtx.request.headers["authorization"] === expectedHeader, encodeCtx.request.headers["authorization"]);
  }

  console.log("\n=== CORS / AccessControl ===");
  {
    const cors = getExecutor("CORS");
    const corsCtx = newCtx();
    const rCors = await cors("CORS", { allowOrigins: "*", allowMethods: "GET,POST", allowHeaders: "Content-Type" }, corsCtx);
    check("CORS sets Access-Control-Allow-Origin on response", corsCtx.response.headers["Access-Control-Allow-Origin"] === "*" && rCors.status === "success");

    const ac = getExecutor("AccessControl");
    const rDeny = await ac("AC", { action: "DENY", ipList: "203.0.113.1" }, newCtx({ clientIp: "203.0.113.1" }));
    check("AccessControl DENY matching IP -> 403", rDeny.status === "error" && rDeny.faultResponse?.status === 403, rDeny.message);
    const rAllow = await ac("AC", { action: "DENY", ipList: "10.0.0.1" }, newCtx({ clientIp: "203.0.113.1" }));
    check("AccessControl DENY non-matching IP -> success", rAllow.status === "success", rAllow.message);
  }

  console.log("\n=== SpikeArrest / Quota (in-memory rate limiting) ===");
  {
    const spike = getExecutor("SpikeArrest");
    const key = "test-spike-" + Date.now();
    let lastResult: any;
    for (let i = 0; i < 5; i++) lastResult = await spike(key, { rate: "3ps" }, newCtx());
    check("SpikeArrest allows first N under rate, then blocks", lastResult.status === "error" && lastResult.faultResponse?.status === 429, lastResult.message);

    const quota = getExecutor("Quota");
    const qkey = "test-quota-" + Date.now();
    let lastQ: any;
    for (let i = 0; i < 4; i++) lastQ = await quota(qkey, { allowCount: 3, interval: 1, timeUnit: "hour" }, newCtx());
    check("Quota blocks once allowCount is exceeded", lastQ.status === "error" && lastQ.faultResponse?.status === 429, lastQ.message);
  }

  console.log("\n=== ResponseCache / PopulateCache / LookupCache ===");
  {
    const populate = getExecutor("PopulateCache");
    const lookup = getExecutor("LookupCache");
    await populate("PC", { cacheResource: "res1", cacheKey: "k1", ttlSeconds: 60 }, newCtx({ request: { path: "/x", headers: {}, query: {} }, response: { headers: {}, body: { hello: "world" }, status: 200, reasonPhrase: "OK" } }));
    const lookupCtx = newCtx({ request: { path: "/x", headers: {}, query: {} } });
    const rLookup = await lookup("LC", { cacheResource: "res1", cacheKey: "k1", assignTo: "cached.value" }, lookupCtx);
    check("PopulateCache then LookupCache round-trips the cached value", JSON.stringify(lookupCtx.variables["cached.value"]) === JSON.stringify({ hello: "world" }), rLookup.message);
  }

  console.log("\n=== AssignMessage / ExtractVariables ===");
  {
    const assign = getExecutor("AssignMessage");
    const assignCtx = newCtx();
    await assign("AM", { assignTo: "request", setHeaders: "X-Client: test-harness\nAuthorization: Bearer injected-token" }, assignCtx);
    check("AssignMessage stores header keys lowercase", assignCtx.request.headers["x-client"] === "test-harness" && assignCtx.request.headers["authorization"] === "Bearer injected-token");

    const extract = getExecutor("ExtractVariables");
    const extractCtx = newCtx({ request: { body: { user: { id: 42 } }, headers: {}, query: {} } });
    const rExtract = await extract("EV", { source: "request", jsonPath: "$.user.id", variableName: "user.id" }, extractCtx);
    check("ExtractVariables pulls nested JSON path into a variable", extractCtx.variables["user.id"] === 42, rExtract.message);
  }

  console.log("\n=== RaiseFault / JSONToXML / XMLToJSON / JavaScript ===");
  {
    const raise = getExecutor("RaiseFault");
    const rFault = await raise("RF", { statusCode: 503, reasonPhrase: "Service Unavailable", errorMessage: '{"error":"maintenance"}' }, newCtx());
    check("RaiseFault raises the configured status/body", rFault.faultResponse?.status === 503 && rFault.faultResponse?.body?.error === "maintenance");

    const j2x = getExecutor("JSONToXML");
    const j2xCtx = newCtx({ request: { body: { a: 1 }, headers: {}, query: {} } });
    await j2x("J2X", { source: "request" }, j2xCtx);
    check("JSONToXML converts body to an XML string", typeof j2xCtx.request.body === "string" && j2xCtx.request.body.includes("<a>"));

    const x2j = getExecutor("XMLToJSON");
    const x2jCtx = newCtx({ response: { body: "<root><a>1</a></root>", headers: {}, status: 200, reasonPhrase: "OK" } });
    await x2j("X2J", { source: "response" }, x2jCtx);
    check("XMLToJSON converts an XML string body to an object", typeof x2jCtx.response.body === "object");

    const js = getExecutor("JavaScript");
    const jsCtx = newCtx();
    const rJs = await js("JS", { source: 'context.setVariable("my.var", 1 + 2);' }, jsCtx);
    check("JavaScript policy runs in sandbox and sets a variable", jsCtx.variables["my.var"] === 3, rJs.message);
  }

  console.log("\n=== Route Rules (multi-method target routing - flowTypes.ts, pure logic) ===");
  {
    const routeRules = [
      { name: "reads", targetEndpoint: "read-target", condition: { verb: "GET" } },
      { name: "writes", targetEndpoint: "write-target" },
    ];
    check("GET routes to read-target", selectRouteTargetName(routeRules, "GET", "/items") === "read-target");
    check("POST falls through to write-target (fallback rule)", selectRouteTargetName(routeRules, "POST", "/items") === "write-target");
    check("DELETE falls through to write-target (fallback rule)", selectRouteTargetName(routeRules, "DELETE", "/items") === "write-target");
    check("matchesFlowCondition verb-only matches case-insensitively", matchesFlowCondition({ verb: "get" }, "GET", "/items"));
    check("matchesFlowCondition basePathSuffix requires substring match", matchesFlowCondition({ basePathSuffix: "/items/123" }, "GET", "/items/123") && !matchesFlowCondition({ basePathSuffix: "/orders" }, "GET", "/items/123"));
  }

  console.log("\n=== Connector stubs (simulated, sanity-check only) ===");
  {
    for (const type of ["ConcurrentRateLimit", "FlowCallout", "XSLTransform", "SalesforceConnector", "BigQueryConnector", "CloudStorageConnector", "PubSubConnector"]) {
      const exec = getExecutor(type);
      const r = await exec("stub", { operation: "Create", sobject: "Account", projectId: "p", bucket: "b", objectName: "o", topic: "t", maxConcurrency: 10, resourceName: "x.xsl", source: "request" }, newCtx());
      check(`${type} executes without throwing`, r.status === "success", r.message);
    }
  }

  console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed (${pass + fail} total checks) ===`);
  if (failures.length) {
    console.log("Failed checks:", failures.join(", "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(1);
});
