// Apigee X Simulator - Policy Catalog
// Framework-agnostic definitions describing every supported policy type:
// its category, configurable fields, defaults, and an XML template generator
// that mirrors real Apigee policy XML syntax. This file is intentionally
// dependency-free so it can be shared verbatim between backend and frontend.

export type PolicyFieldType =
  | "text"
  | "number"
  | "select"
  | "boolean"
  | "textarea"
  | "keyvalue"
  | "list";

export interface PolicyFieldDef {
  key: string;
  label: string;
  type: PolicyFieldType;
  options?: string[];
  default?: any;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
}

export interface PolicyTypeDef {
  type: string;
  category:
    | "Security"
    | "Traffic Management"
    | "Mediation"
    | "Transformation"
    | "Extension";
  description: string;
  whenToUse: string;
  fields: PolicyFieldDef[];
  defaultConfig: Record<string, any>;
  buildXml: (name: string, config: Record<string, any>) => string;
  validate: (config: Record<string, any>) => string[];
}

function esc(s: any): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reqCheck(config: Record<string, any>, fields: PolicyFieldDef[]): string[] {
  const errors: string[] = [];
  for (const f of fields) {
    if (f.required) {
      const v = config[f.key];
      if (v === undefined || v === null || v === "") {
        errors.push(`"${f.label}" is required.`);
      }
    }
  }
  return errors;
}

export const POLICY_CATALOG: PolicyTypeDef[] = [
  // ---------------------------------------------------------------- SECURITY
  {
    type: "VerifyAPIKey",
    category: "Security",
    description: "Validates the API key sent in a request against a registered developer app.",
    whenToUse: "Attach to a proxy's PreFlow to require a valid Consumer Key on every request; pair it with an API Product to control which endpoints a given key can reach. Works with the key passed as either a query param or a header.",
    fields: [
      { key: "apiKeyLocation", label: "API Key Location", type: "select", options: ["query", "header"], default: "query" },
      { key: "apiKeyParam", label: "Parameter Name", type: "text", default: "apikey", required: true },
    ],
    defaultConfig: { apiKeyLocation: "query", apiKeyParam: "apikey" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.VerifyAPIKey),
    buildXml: (name, c) => `<VerifyAPIKey name="${esc(name)}">
  <APIKey ref="${c.apiKeyLocation === "header" ? "request.header." : "request.queryparam."}${esc(c.apiKeyParam)}"/>
</VerifyAPIKey>`,
  },
  {
    type: "OAuthV2",
    category: "Security",
    description: "Generates, validates, or refreshes OAuth v2.0 access tokens.",
    whenToUse: "Use one instance configured for GenerateAccessToken on a dedicated token-issuing proxy (e.g. /oauth/token), and a second instance configured for VerifyAccessToken on protected proxies. In this simulator the tokens are real and server-side, not a pass/fail simulation.",
    fields: [
      { key: "operation", label: "Operation", type: "select", options: ["GenerateAccessToken", "VerifyAccessToken", "RefreshAccessToken", "GenerateAuthorizationCode"], default: "VerifyAccessToken" },
      { key: "grantType", label: "Grant Type", type: "select", options: ["client_credentials", "authorization_code", "password", "refresh_token"], default: "client_credentials" },
      { key: "scopes", label: "Required Scopes (comma-separated)", type: "text", default: "read" },
      { key: "accessTokenLocation", label: "Access Token Location (VerifyAccessToken)", type: "select", options: ["Header", "Query Parameter"], default: "Header" },
      { key: "accessTokenHeaderName", label: "Header Name (when Location = Header)", type: "text", default: "Authorization" },
      { key: "accessTokenQueryParam", label: "Query Param Name (when Location = Query Parameter)", type: "text", default: "access_token" },
    ],
    defaultConfig: {
      operation: "VerifyAccessToken",
      grantType: "client_credentials",
      scopes: "read",
      accessTokenLocation: "Header",
      accessTokenHeaderName: "Authorization",
      accessTokenQueryParam: "access_token",
    },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.OAuthV2),
    buildXml: (name, c) => `<OAuthV2 name="${esc(name)}">
  <Operation>${esc(c.operation)}</Operation>
  <GrantType>${esc(c.grantType)}</GrantType>
  <Scope>${esc(c.scopes)}</Scope>
  <AccessTokenLocation>${esc(c.accessTokenLocation)}</AccessTokenLocation>
  ${c.accessTokenLocation === "Query Parameter" ? `<QueryParameter>${esc(c.accessTokenQueryParam)}</QueryParameter>` : `<Header>${esc(c.accessTokenHeaderName)}</Header>`}
</OAuthV2>`,
  },
  {
    type: "VerifyJWT",
    category: "Security",
    description: "Validates a JSON Web Token's signature, issuer, audience, and expiry.",
    whenToUse: "Place in PreFlow to check a signed JWT's issuer, audience, and expiry before letting the request through. An expired or malformed token immediately short-circuits the flow with a 401 fault, skipping every step after it.",
    fields: [
      { key: "source", label: "JWT Source Variable", type: "text", default: "request.header.Authorization" },
      { key: "algorithm", label: "Algorithm", type: "select", options: ["RS256", "HS256", "ES256"], default: "RS256" },
      { key: "issuer", label: "Issuer", type: "text", default: "https://accounts.example.com" },
      { key: "audience", label: "Audience", type: "text", default: "my-api" },
      { key: "jwksRef", label: "JWKS Reference Name", type: "text", default: "jwks-reference" },
    ],
    defaultConfig: { source: "request.header.Authorization", algorithm: "RS256", issuer: "https://accounts.example.com", audience: "my-api", jwksRef: "jwks-reference" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.VerifyJWT),
    buildXml: (name, c) => `<VerifyJWT name="${esc(name)}">
  <Algorithm>${esc(c.algorithm)}</Algorithm>
  <Source>${esc(c.source)}</Source>
  <Issuer>${esc(c.issuer)}</Issuer>
  <Audience>${esc(c.audience)}</Audience>
  <PublicKey>
    <JWKS ref="${esc(c.jwksRef)}"/>
  </PublicKey>
</VerifyJWT>`,
  },
  {
    type: "BasicAuthentication",
    category: "Security",
    description: "Encodes or decodes HTTP Basic Authentication headers.",
    whenToUse: "Decode a Basic Authorization header into username/password flow variables early in PreFlow, typically before forwarding credentials to a legacy backend. Switch to Encode when calling an outbound target that only accepts Basic Auth. Turn on \"Validate Against KVM\" (Decode only) to check the decoded credentials against a Key Value Map instead of just extracting them - a simulator convenience standing in for the decode + KVM Get + Condition chain real Apigee flows normally use for this.",
    fields: [
      { key: "operation", label: "Operation", type: "select", options: ["Decode", "Encode"], default: "Decode" },
      { key: "user", label: "User Variable", type: "text", default: "request.formparam.username" },
      { key: "password", label: "Password Variable", type: "text", default: "request.formparam.password" },
      { key: "validateAgainstKvm", label: "Validate Against KVM (Decode only)", type: "boolean", default: false },
      { key: "kvmName", label: "KVM Name", type: "text", default: "" },
      { key: "kvmUsernameKey", label: "KVM Username Key", type: "text", default: "username" },
      { key: "kvmPasswordKey", label: "KVM Password Key", type: "text", default: "password" },
    ],
    defaultConfig: { operation: "Decode", user: "request.formparam.username", password: "request.formparam.password", validateAgainstKvm: false, kvmName: "", kvmUsernameKey: "username", kvmPasswordKey: "password" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.BasicAuthentication),
    buildXml: (name, c) => `<BasicAuthentication name="${esc(name)}">
  <Operation>${esc(c.operation)}</Operation>
  <User ref="${esc(c.user)}"/>
  <Password ref="${esc(c.password)}"/>${c.validateAgainstKvm ? `\n  <!-- Simulator extension: decoded credentials are checked against this KVM instead of only being extracted -->\n  <KeyValueMapOperations mapIdentifier="${esc(c.kvmName)}">\n    <Get assignTo="kvm.username"><Key><Parameter>${esc(c.kvmUsernameKey)}</Parameter></Key></Get>\n    <Get assignTo="kvm.password"><Key><Parameter>${esc(c.kvmPasswordKey)}</Parameter></Key></Get>\n  </KeyValueMapOperations>` : ""}
</BasicAuthentication>`,
  },
  {
    type: "CORS",
    category: "Security",
    description: "Adds Cross-Origin Resource Sharing headers to responses.",
    whenToUse: "Add to PostFlow (or an error flow) so browser-based clients can call your API cross-origin without being blocked by preflight checks. Supports wildcard or explicit origins, plus credentialed requests via AllowCredentials.",
    fields: [
      { key: "allowOrigins", label: "Allowed Origins", type: "text", default: "*" },
      { key: "allowMethods", label: "Allowed Methods", type: "text", default: "GET,PUT,POST,DELETE,OPTIONS" },
      { key: "allowHeaders", label: "Allowed Headers", type: "text", default: "Origin, X-Requested-With, Content-Type, Accept, Authorization" },
      { key: "exposeHeaders", label: "Expose Headers", type: "text", default: "" },
      { key: "allowCredentials", label: "Allow Credentials", type: "boolean", default: false },
    ],
    defaultConfig: { allowOrigins: "*", allowMethods: "GET,PUT,POST,DELETE,OPTIONS", allowHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization", exposeHeaders: "", allowCredentials: false },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.CORS),
    buildXml: (name, c) => `<CORS name="${esc(name)}">
  <AllowOrigins>${esc(c.allowOrigins)}</AllowOrigins>
  <AllowMethods>${esc(c.allowMethods)}</AllowMethods>
  <AllowHeaders>${esc(c.allowHeaders)}</AllowHeaders>
  <ExposeHeaders>${esc(c.exposeHeaders)}</ExposeHeaders>
  <AllowCredentials>${c.allowCredentials ? "true" : "false"}</AllowCredentials>
</CORS>`,
  },
  {
    type: "AccessControl",
    category: "Security",
    description: "Allows or denies requests based on client IP address.",
    whenToUse: "Use as an IP allow/deny list, typically very early in PreFlow, to block traffic from specific networks before any other processing happens. Supports CIDR ranges, not just single IPs.",
    fields: [
      { key: "action", label: "Action", type: "select", options: ["ALLOW", "DENY"], default: "DENY" },
      { key: "ipList", label: "IP Addresses / CIDRs (comma-separated)", type: "text", default: "10.0.0.0/8" },
    ],
    defaultConfig: { action: "DENY", ipList: "10.0.0.0/8" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.AccessControl),
    buildXml: (name, c) => `<AccessControl name="${esc(name)}">
  <MatchRules>
    ${c.ipList.split(",").map((ip: string) => `<MatchRule action="${esc(c.action)}">
      <SourceAddress mask="32">${esc(ip.trim())}</SourceAddress>
    </MatchRule>`).join("\n    ")}
  </MatchRules>
</AccessControl>`,
  },

  // ------------------------------------------------------- TRAFFIC MANAGEMENT
  {
    type: "SpikeArrest",
    category: "Traffic Management",
    description: "Smooths traffic spikes by limiting requests to a steady rate.",
    whenToUse: "Place first in PreFlow to smooth bursts and protect the backend from sudden spikes, independent of any longer-term quota. Rate is a simple string like 50ps (per second) or 30pm (per minute) - pick whatever matches your backend's real capacity.",
    fields: [
      { key: "rate", label: "Rate (e.g. 100ps, 30pm)", type: "text", default: "100ps", required: true },
      { key: "identifierRef", label: "Identifier (optional, per client)", type: "text", default: "" },
    ],
    defaultConfig: { rate: "100ps", identifierRef: "" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.SpikeArrest),
    buildXml: (name, c) => `<SpikeArrest name="${esc(name)}">
  <Rate>${esc(c.rate)}</Rate>${c.identifierRef ? `\n  <Identifier ref="${esc(c.identifierRef)}"/>` : ""}
</SpikeArrest>`,
  },
  {
    type: "Quota",
    category: "Traffic Management",
    description: "Enforces a consumption limit (requests per interval) for API products/apps.",
    whenToUse: "Enforce a per-app or per-product consumption ceiling (e.g. 1000 calls/day) after authentication has already run, so only identified callers are counted. The counter persists across the configured interval and resets automatically once it elapses.",
    fields: [
      { key: "allowCount", label: "Allow Count", type: "number", default: 1000, required: true },
      { key: "interval", label: "Interval", type: "number", default: 1, required: true },
      { key: "timeUnit", label: "Time Unit", type: "select", options: ["minute", "hour", "day", "month"], default: "hour" },
    ],
    defaultConfig: { allowCount: 1000, interval: 1, timeUnit: "hour" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.Quota),
    buildXml: (name, c) => `<Quota name="${esc(name)}">
  <Interval>${esc(c.interval)}</Interval>
  <TimeUnit>${esc(c.timeUnit)}</TimeUnit>
  <Allow count="${esc(c.allowCount)}"/>
</Quota>`,
  },
  {
    type: "ConcurrentRateLimit",
    category: "Traffic Management",
    description: "Limits the number of concurrent requests processed at once.",
    whenToUse: "Cap how many requests can be in flight at the same time for a proxy - useful when the backend can only handle limited parallelism regardless of overall rate. Independent of SpikeArrest/Quota: this limits concurrency, not throughput.",
    fields: [
      { key: "maxConcurrency", label: "Max Concurrent Connections", type: "number", default: 10, required: true },
    ],
    defaultConfig: { maxConcurrency: 10 },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.ConcurrentRateLimit),
    buildXml: (name, c) => `<ConcurrentRatelimit name="${esc(name)}">
  <MaxConcurrency>${esc(c.maxConcurrency)}</MaxConcurrency>
</ConcurrentRatelimit>`,
  },

  // ------------------------------------------------------------- MEDIATION
  {
    type: "AssignMessage",
    category: "Mediation",
    description: "Constructs or modifies request/response messages: set headers, params, payload.",
    whenToUse: "The general-purpose policy for adding/removing headers, setting a payload, or normalizing a request/response - usable in any flow phase. Can target either the request or the response with the same policy type, just flip Assign To.",
    fields: [
      { key: "assignTo", label: "Assign To", type: "select", options: ["request", "response"], default: "request" },
      { key: "setHeaders", label: "Set Headers (key: value per line)", type: "textarea", default: "X-Powered-By: Apigee-Simulator" },
      { key: "setPayload", label: "Set Payload", type: "textarea", default: "" },
    ],
    defaultConfig: { assignTo: "request", setHeaders: "X-Powered-By: Apigee-Simulator", setPayload: "" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.AssignMessage),
    buildXml: (name, c) => {
      const headerLines = (c.setHeaders || "").split("\n").filter(Boolean).map((l: string) => {
        const idx = l.indexOf(":");
        const k = idx >= 0 ? l.slice(0, idx).trim() : l.trim();
        const v = idx >= 0 ? l.slice(idx + 1).trim() : "";
        return `      <Header name="${esc(k)}">${esc(v)}</Header>`;
      }).join("\n");
      return `<AssignMessage name="${esc(name)}">
  <AssignTo createNew="false" transport="http" type="${esc(c.assignTo)}"/>
  <Set>
    <Headers>
${headerLines}
    </Headers>${c.setPayload ? `\n    <Payload contentType="application/json">${esc(c.setPayload)}</Payload>` : ""}
  </Set>
</AssignMessage>`;
    },
  },
  {
    type: "ExtractVariables",
    category: "Mediation",
    description: "Extracts values from request/response into flow variables using patterns.",
    whenToUse: "Pull a value out of an incoming JSON payload (or a response) into a named flow variable so later policies or conditions can act on it. JSONPath-based, so it works on nested payload structures, not just top-level fields.",
    fields: [
      { key: "source", label: "Source", type: "select", options: ["request", "response"], default: "request" },
      { key: "variableName", label: "Variable Name", type: "text", default: "extracted.value", required: true },
      { key: "jsonPath", label: "JSONPath", type: "text", default: "$.id" },
    ],
    defaultConfig: { source: "request", variableName: "extracted.value", jsonPath: "$.id" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.ExtractVariables),
    buildXml: (name, c) => `<ExtractVariables name="${esc(name)}">
  <Source>${esc(c.source)}</Source>
  <JSONPayload>
    <Variable name="${esc(c.variableName)}" type="string">
      <JSONPath>${esc(c.jsonPath)}</JSONPath>
    </Variable>
  </JSONPayload>
</ExtractVariables>`,
  },
  {
    type: "ServiceCallout",
    category: "Mediation",
    description: "Makes an out-of-band HTTP call to another service mid-flow.",
    whenToUse: "Make a side HTTP call to an auxiliary service mid-flow - e.g. a fraud check or enrichment lookup - without disrupting the main proxy-to-target request. The callout's response lands in its own flow variable, kept separate from the main response.",
    fields: [
      { key: "targetUrl", label: "Target URL", type: "text", default: "https://jsonplaceholder.typicode.com/todos/1", required: true },
      { key: "method", label: "HTTP Method", type: "select", options: ["GET", "POST", "PUT", "DELETE"], default: "GET" },
      { key: "responseVariable", label: "Response Variable", type: "text", default: "calloutResponse" },
    ],
    defaultConfig: { targetUrl: "https://jsonplaceholder.typicode.com/todos/1", method: "GET", responseVariable: "calloutResponse" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.ServiceCallout),
    buildXml: (name, c) => `<ServiceCallout name="${esc(name)}">
  <Request>
    <Set>
      <Verb>${esc(c.method)}</Verb>
    </Set>
  </Request>
  <Response>${esc(c.responseVariable)}</Response>
  <HTTPTargetConnection>
    <URL>${esc(c.targetUrl)}</URL>
  </HTTPTargetConnection>
</ServiceCallout>`,
  },
  {
    type: "FlowCallout",
    category: "Mediation",
    description: "Invokes a Shared Flow from within a proxy or shared flow.",
    whenToUse: "Invoke a reusable Shared Flow (like the bundled Common-Security-Flow) from inside a proxy so common logic isn't duplicated across many proxies. For logic that should apply everywhere automatically, attach the shared flow globally via a Flow Hook instead.",
    fields: [
      { key: "sharedFlowName", label: "Shared Flow Name", type: "text", default: "", required: true },
    ],
    defaultConfig: { sharedFlowName: "" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.FlowCallout),
    buildXml: (name, c) => `<FlowCallout name="${esc(name)}">
  <SharedFlowBundle>${esc(c.sharedFlowName)}</SharedFlowBundle>
</FlowCallout>`,
  },
  {
    type: "JavaScript",
    category: "Mediation",
    description: "Runs custom JavaScript against the message context.",
    whenToUse: "Drop in custom scripting logic when no built-in policy covers your use case - e.g. bespoke header manipulation or conditional logic. Has access to context.getVariable/setVariable just like real Apigee's JavaScript policy.",
    fields: [
      { key: "resourceName", label: "Resource File Name", type: "text", default: "script.js" },
      { key: "source", label: "JavaScript Source", type: "textarea", default: "context.setVariable('custom.executed', true);" },
    ],
    defaultConfig: { resourceName: "script.js", source: "context.setVariable('custom.executed', true);" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.JavaScript),
    buildXml: (name, c) => `<Javascript name="${esc(name)}">
  <ResourceURL>jsc://${esc(c.resourceName)}</ResourceURL>
</Javascript>`,
  },
  {
    type: "MessageLogging",
    category: "Mediation",
    description: "Sends log messages to a syslog target for observability.",
    whenToUse: "Ship a formatted log line to an external syslog target for auditing/observability, usually in PostFlow once the response is known. The message template supports flow variables like {response.status.code} and {request.uri}.",
    fields: [
      { key: "syslogHost", label: "Syslog Host", type: "text", default: "logs.example.com" },
      { key: "syslogPort", label: "Syslog Port", type: "number", default: 514 },
      { key: "messageTemplate", label: "Message Template", type: "textarea", default: "{organization.name} {request.uri} {response.status.code}" },
    ],
    defaultConfig: { syslogHost: "logs.example.com", syslogPort: 514, messageTemplate: "{organization.name} {request.uri} {response.status.code}" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.MessageLogging),
    buildXml: (name, c) => `<MessageLogging name="${esc(name)}">
  <Syslog>
    <Message>${esc(c.messageTemplate)}</Message>
    <Host>${esc(c.syslogHost)}</Host>
    <Port>${esc(c.syslogPort)}</Port>
  </Syslog>
</MessageLogging>`,
  },
  {
    type: "RaiseFault",
    category: "Mediation",
    description: "Raises a custom fault and halts flow execution with a specific error response.",
    whenToUse: "Deliberately short-circuit the flow with a custom HTTP status/body - e.g. reject a malformed request outright with a tailored error payload. Once any policy raises a fault, every subsequent step in the flow is automatically skipped.",
    fields: [
      { key: "statusCode", label: "HTTP Status Code", type: "number", default: 400, required: true },
      { key: "reasonPhrase", label: "Reason Phrase", type: "text", default: "Bad Request" },
      { key: "errorMessage", label: "Error Payload", type: "textarea", default: '{"error": "Invalid request"}' },
    ],
    defaultConfig: { statusCode: 400, reasonPhrase: "Bad Request", errorMessage: '{"error": "Invalid request"}' },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.RaiseFault),
    buildXml: (name, c) => `<RaiseFault name="${esc(name)}">
  <FaultResponse>
    <Set>
      <StatusCode>${esc(c.statusCode)}</StatusCode>
      <ReasonPhrase>${esc(c.reasonPhrase)}</ReasonPhrase>
      <Payload contentType="application/json">${esc(c.errorMessage)}</Payload>
    </Set>
  </FaultResponse>
</RaiseFault>`,
  },

  // --------------------------------------------------------- TRANSFORMATION
  {
    type: "JSONToXML",
    category: "Transformation",
    description: "Converts a JSON payload into XML.",
    whenToUse: "Convert a JSON body to XML immediately before a legacy, XML-only backend, or before returning XML to an older client. Works on either the request or response side depending on Source.",
    fields: [
      { key: "source", label: "Source", type: "select", options: ["request", "response"], default: "response" },
    ],
    defaultConfig: { source: "response" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.JSONToXML),
    buildXml: (name, c) => `<JSONToXML name="${esc(name)}">
  <Source>${esc(c.source)}</Source>
</JSONToXML>`,
  },
  {
    type: "XMLToJSON",
    category: "Transformation",
    description: "Converts an XML payload into JSON.",
    whenToUse: "Convert an XML backend response into JSON before it reaches a modern, JSON-only client. The mirror image of JSONToXML - pick whichever direction your integration needs.",
    fields: [
      { key: "source", label: "Source", type: "select", options: ["request", "response"], default: "response" },
    ],
    defaultConfig: { source: "response" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.XMLToJSON),
    buildXml: (name, c) => `<XMLToJSON name="${esc(name)}">
  <Source>${esc(c.source)}</Source>
</XMLToJSON>`,
  },
  {
    type: "XSLTransform",
    category: "Transformation",
    description: "Applies an XSL stylesheet to transform an XML message.",
    whenToUse: "Apply a full XSL stylesheet when you need more than a straight format conversion - e.g. restructuring, filtering, or renaming XML elements. More powerful than XMLToJSON/JSONToXML for complex mappings.",
    fields: [
      { key: "resourceName", label: "XSL Resource Name", type: "text", default: "transform.xsl" },
      { key: "source", label: "Source", type: "select", options: ["request", "response"], default: "response" },
    ],
    defaultConfig: { resourceName: "transform.xsl", source: "response" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.XSLTransform),
    buildXml: (name, c) => `<XSLTransform name="${esc(name)}">
  <ResourceURL>xsl://${esc(c.resourceName)}</ResourceURL>
  <Source>${esc(c.source)}</Source>
</XSLTransform>`,
  },

  // ------------------------------------------------------------- EXTENSION
  {
    type: "SalesforceConnector",
    category: "Extension",
    description: "Calls Salesforce APIs (Extension policy simulation).",
    whenToUse: "Use when a proxy needs to read or write Salesforce objects mid-flow - e.g. creating a Lead from an inbound webhook. Demonstrates the Extension policy category's connector pattern (Connector + Action + Object).",
    fields: [
      { key: "operation", label: "Operation", type: "select", options: ["query", "create", "update", "delete"], default: "query" },
      { key: "sobject", label: "SObject", type: "text", default: "Account" },
    ],
    defaultConfig: { operation: "query", sobject: "Account" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.SalesforceConnector),
    buildXml: (name, c) => `<ConnectorCallout name="${esc(name)}" async="false" continueOnError="false" enabled="true">
  <Connector>salesforce-connector</Connector>
  <Action>${esc(c.operation)}</Action>
  <Object>${esc(c.sobject)}</Object>
</ConnectorCallout>`,
  },
  {
    type: "BigQueryConnector",
    category: "Extension",
    description: "Executes a query against Google BigQuery (Extension policy simulation).",
    whenToUse: "Use for analytics-style proxies that need to run a SQL query against BigQuery mid-flow and return rows in the response. Same Extension-policy pattern as the other connectors - only the backend service changes.",
    fields: [
      { key: "projectId", label: "Project ID", type: "text", default: "my-gcp-project" },
      { key: "query", label: "SQL Query", type: "textarea", default: "SELECT * FROM dataset.table LIMIT 10" },
    ],
    defaultConfig: { projectId: "my-gcp-project", query: "SELECT * FROM dataset.table LIMIT 10" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.BigQueryConnector),
    buildXml: (name, c) => `<ConnectorCallout name="${esc(name)}" async="false" continueOnError="false" enabled="true">
  <Connector>bigquery-connector</Connector>
  <ProjectId>${esc(c.projectId)}</ProjectId>
  <Query>${esc(c.query)}</Query>
</ConnectorCallout>`,
  },
  {
    type: "CloudStorageConnector",
    category: "Extension",
    description: "Reads or writes objects in Google Cloud Storage (Extension policy simulation).",
    whenToUse: "Use when a proxy needs to read, write, list, or delete an object in Cloud Storage as part of handling a request - e.g. fetching a config file. Operation and bucket/object are fully configurable per call.",
    fields: [
      { key: "bucket", label: "Bucket Name", type: "text", default: "my-bucket" },
      { key: "operation", label: "Operation", type: "select", options: ["read", "write", "delete", "list"], default: "read" },
      { key: "objectName", label: "Object Name", type: "text", default: "file.json" },
    ],
    defaultConfig: { bucket: "my-bucket", operation: "read", objectName: "file.json" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.CloudStorageConnector),
    buildXml: (name, c) => `<ConnectorCallout name="${esc(name)}" async="false" continueOnError="false" enabled="true">
  <Connector>cloud-storage-connector</Connector>
  <Bucket>${esc(c.bucket)}</Bucket>
  <Action>${esc(c.operation)}</Action>
  <Object>${esc(c.objectName)}</Object>
</ConnectorCallout>`,
  },
  {
    type: "PubSubConnector",
    category: "Extension",
    description: "Publishes or subscribes to Google Cloud Pub/Sub topics (Extension policy simulation).",
    whenToUse: "Use for fire-and-forget event proxies that need to publish a message (or pull one) from a Pub/Sub topic mid-flow. Rounds out the four common GCP Extension connectors alongside BigQuery/Storage/Salesforce.",
    fields: [
      { key: "topic", label: "Topic Name", type: "text", default: "my-topic" },
      { key: "operation", label: "Operation", type: "select", options: ["publish", "pull"], default: "publish" },
    ],
    defaultConfig: { topic: "my-topic", operation: "publish" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.PubSubConnector),
    buildXml: (name, c) => `<ConnectorCallout name="${esc(name)}" async="false" continueOnError="false" enabled="true">
  <Connector>pubsub-connector</Connector>
  <Topic>${esc(c.topic)}</Topic>
  <Action>${esc(c.operation)}</Action>
</ConnectorCallout>`,
  },

  // ----------------------------------------------------------- CACHING (bonus)
  {
    type: "ResponseCache",
    category: "Traffic Management",
    description: "Caches full responses for a configured TTL to reduce backend load.",
    whenToUse: "Attach around the target call (PreFlow to check, PostFlow to populate) so repeat requests skip the backend entirely for the TTL window. In this simulator's Trace tool, a cache hit visibly skips the Target Request step.",
    fields: [
      { key: "cacheKey", label: "Cache Key Fragment", type: "text", default: "request.uri" },
      { key: "ttlSeconds", label: "TTL (seconds)", type: "number", default: 300 },
    ],
    defaultConfig: { cacheKey: "request.uri", ttlSeconds: 300 },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.ResponseCache),
    buildXml: (name, c) => `<ResponseCache name="${esc(name)}">
  <CacheKey>
    <KeyFragment ref="${esc(c.cacheKey)}"/>
  </CacheKey>
  <ExpirySettings>
    <TimeoutInSec>${esc(c.ttlSeconds)}</TimeoutInSec>
  </ExpirySettings>
</ResponseCache>`,
  },
  {
    type: "PopulateCache",
    category: "Traffic Management",
    description: "Writes a value into a named cache resource for later lookup.",
    whenToUse: "Manually write a value into a named, reusable cache resource - more flexible than ResponseCache when you want to cache something other than the whole response (e.g. a computed value). Pairs with LookupCache for a full manual read/write cycle.",
    fields: [
      { key: "cacheResource", label: "Cache Resource Name", type: "text", default: "default-cache" },
      { key: "cacheKey", label: "Cache Key Fragment", type: "text", default: "request.uri" },
      { key: "ttlSeconds", label: "TTL (seconds)", type: "number", default: 300 },
    ],
    defaultConfig: { cacheResource: "default-cache", cacheKey: "request.uri", ttlSeconds: 300 },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.PopulateCache),
    buildXml: (name, c) => `<PopulateCache name="${esc(name)}">
  <CacheResource>${esc(c.cacheResource)}</CacheResource>
  <CacheKey>
    <KeyFragment ref="${esc(c.cacheKey)}"/>
  </CacheKey>
  <ExpirySettings>
    <TimeoutInSec>${esc(c.ttlSeconds)}</TimeoutInSec>
  </ExpirySettings>
</PopulateCache>`,
  },
  {
    type: "LookupCache",
    category: "Traffic Management",
    description: "Reads a value from a named cache resource, assigning it to a variable.",
    whenToUse: "Read a previously cached value into a flow variable, typically checked early to decide whether to skip expensive downstream steps. Pairs with PopulateCache to build custom caching logic beyond what ResponseCache offers.",
    fields: [
      { key: "cacheResource", label: "Cache Resource Name", type: "text", default: "default-cache" },
      { key: "cacheKey", label: "Cache Key Fragment", type: "text", default: "request.uri" },
      { key: "assignTo", label: "Assign To Variable", type: "text", default: "cache.lookup.result" },
    ],
    defaultConfig: { cacheResource: "default-cache", cacheKey: "request.uri", assignTo: "cache.lookup.result" },
    validate: (c) => reqCheck(c, POLICY_CATALOG_FIELDS.LookupCache),
    buildXml: (name, c) => `<LookupCache name="${esc(name)}">
  <CacheResource>${esc(c.cacheResource)}</CacheResource>
  <CacheKey>
    <KeyFragment ref="${esc(c.cacheKey)}"/>
  </CacheKey>
  <AssignTo>${esc(c.assignTo)}</AssignTo>
</LookupCache>`,
  },
];

// Helper lookup used by validate() closures above (defined after array due to hoisting of const? -> use function)
export const POLICY_CATALOG_FIELDS: Record<string, PolicyFieldDef[]> = POLICY_CATALOG.reduce(
  (acc, p) => {
    acc[p.type] = p.fields;
    return acc;
  },
  {} as Record<string, PolicyFieldDef[]>
);

export function getPolicyDef(type: string): PolicyTypeDef | undefined {
  return POLICY_CATALOG.find((p) => p.type === type);
}

export const POLICY_CATEGORIES = [
  "Security",
  "Traffic Management",
  "Mediation",
  "Transformation",
  "Extension",
] as const;
