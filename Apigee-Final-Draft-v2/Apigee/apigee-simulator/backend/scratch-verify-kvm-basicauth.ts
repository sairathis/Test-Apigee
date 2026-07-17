// Scratch verification script (not part of the deliverable) - proves the new
// BasicAuthentication "Validate Against KVM" branch in policyExecutors.ts behaves
// correctly, without needing a real Prisma engine (blocked in this sandbox).
// Hijacks require.cache for "./prisma" with a fake in-memory KVM store before
// policyExecutors.ts is loaded, matching the technique used earlier this session.

import Module from "module";
import path from "path";

const prismaPath = require.resolve("./src/utils/prisma");

const KVM_ROWS: Record<string, any> = {
  "basic-auth-creds|organization|null": {
    id: "kvm1",
    name: "basic-auth-creds",
    scope: "organization",
    environmentId: null,
    entries: [
      { id: "e1", key: "username", value: "apiuser" },
      { id: "e2", key: "password", value: "S3cretPass!23" },
    ],
  },
};

const fakePrisma = {
  __esModule: true,
  default: {
    kvm: {
      findFirst: async (args: any) => {
        const w = args.where;
        if (w.scope === "environment") {
          return null; // no environment-scoped KVM seeded in this test
        }
        if (w.scope === "organization" && w.name === "basic-auth-creds") {
          return KVM_ROWS["basic-auth-creds|organization|null"];
        }
        return null;
      },
    },
    developerApp: { findUnique: async () => null, findFirst: async () => null },
    targetServer: { findFirst: async () => null },
  },
};

require.cache[prismaPath] = new (Module as any)(prismaPath);
require.cache[prismaPath]!.exports = fakePrisma;
require.cache[prismaPath]!.loaded = true;

import { getExecutor } from "./src/utils/policyExecutors";

function makeCtx(headers: Record<string, string>) {
  return {
    variables: { "environment.name": "test" },
    request: { headers, body: null, query: {}, formParams: {}, method: "GET", path: "/kvm-secure" },
    response: { headers: {}, body: null, status: 200, reasonPhrase: "OK" },
    clientIp: "203.0.113.1",
  } as any;
}

function b64(s: string) {
  return Buffer.from(s).toString("base64");
}

const config = {
  operation: "Decode",
  user: "request.formparam.username",
  password: "request.formparam.password",
  validateAgainstKvm: true,
  kvmName: "basic-auth-creds",
  kvmUsernameKey: "username",
  kvmPasswordKey: "password",
};

async function main() {
  const exec = getExecutor("BasicAuthentication")!;
  let pass = 0;
  let fail = 0;

  function check(label: string, cond: boolean, detail: any) {
    if (cond) {
      pass++;
      console.log(`PASS: ${label}`);
    } else {
      fail++;
      console.log(`FAIL: ${label}`, JSON.stringify(detail));
    }
  }

  // 1. Correct credentials -> success
  {
    const ctx = makeCtx({ authorization: `Basic ${b64("apiuser:S3cretPass!23")}` });
    const r = await exec("BA-ValidateKvm", config, ctx);
    check("correct credentials succeed", r.status === "success" && r.message.includes("validated against KVM"), r);
  }

  // 2. Wrong password -> 401
  {
    const ctx = makeCtx({ authorization: `Basic ${b64("apiuser:wrongpass")}` });
    const r = await exec("BA-ValidateKvm", config, ctx);
    check(
      "wrong password rejected with 401",
      r.status === "error" && r.faultResponse?.status === 401 && r.faultResponse?.body?.fault?.faultstring === "Invalid basic authentication credentials",
      r
    );
  }

  // 3. Wrong username -> 401
  {
    const ctx = makeCtx({ authorization: `Basic ${b64("nottheuser:S3cretPass!23")}` });
    const r = await exec("BA-ValidateKvm", config, ctx);
    check("wrong username rejected with 401", r.status === "error" && r.faultResponse?.status === 401, r);
  }

  // 4. No Authorization header at all -> 401 "Missing Basic Authorization header"
  {
    const ctx = makeCtx({});
    const r = await exec("BA-ValidateKvm", config, ctx);
    check(
      "missing header rejected before KVM lookup even runs",
      r.status === "error" && r.faultResponse?.status === 401 && r.message === "Missing Basic Authorization header",
      r
    );
  }

  // 5. KVM name that doesn't exist -> 500 "KeyValueMap not found"
  {
    const ctx = makeCtx({ authorization: `Basic ${b64("apiuser:S3cretPass!23")}` });
    const badConfig = { ...config, kvmName: "does-not-exist" };
    const r = await exec("BA-ValidateKvm", badConfig, ctx);
    check("unknown KVM name reported clearly", r.status === "error" && r.faultResponse?.status === 500 && r.message.includes('KVM "does-not-exist" not found'), r);
  }

  // 6. validateAgainstKvm=false (default/original behavior) is unchanged -> plain decode, no KVM lookup
  {
    const ctx = makeCtx({ authorization: `Basic ${b64("anyone:anything")}` });
    const plainConfig = { ...config, validateAgainstKvm: false };
    const r = await exec("BA-ValidateKvm", plainConfig, ctx);
    check("validateAgainstKvm=false preserves original decode-only behavior", r.status === "success" && r.message === "Basic auth decoded", r);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
