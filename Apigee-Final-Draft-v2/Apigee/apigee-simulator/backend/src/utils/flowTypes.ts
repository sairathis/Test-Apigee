// Shape of the JSON blobs stored in ProxyRevision.proxyEndpoint / targetEndpoints
// and SharedFlowRevision.steps. Kept framework-agnostic so the same shapes
// can be mirrored on the frontend for the React Flow visual editor.

export interface FlowStepList {
  request: string[]; // ordered ProxyPolicy names
  response: string[];
}

export interface FlowCondition {
  verb?: string; // e.g. "GET", "POST" - omit to match any verb
  basePathSuffix?: string; // e.g. "/orders/{id}" - omit to match any path
  description?: string;
}

export interface ConditionalFlow {
  name: string;
  condition: FlowCondition;
  request: string[];
  response: string[];
}

export interface RouteRule {
  name: string;
  targetEndpoint: string; // name of the TargetEndpointDef to use when this rule matches
  condition?: FlowCondition; // omitted/undefined => always matches; keep such a rule LAST as the default/fallback route, same as real Apigee
}

export interface ProxyEndpointDef {
  name: string;
  basePath: string;
  preFlow: FlowStepList;
  postFlow: FlowStepList;
  conditionalFlows: ConditionalFlow[];
  routeRules: RouteRule[];
}

export interface TargetEndpointDef {
  name: string;
  preFlow: FlowStepList;
  postFlow: FlowStepList;
  targetServerName?: string;
  url?: string;
  failoverTargetServerName?: string;
  loadBalancingAlgorithm?: "RoundRobin" | "Weighted" | "None";
}

export function defaultProxyEndpoint(basePath: string): ProxyEndpointDef {
  return {
    name: "default",
    basePath,
    preFlow: { request: [], response: [] },
    postFlow: { request: [], response: [] },
    conditionalFlows: [],
    routeRules: [{ name: "default", targetEndpoint: "default" }],
  };
}

export function defaultTargetEndpoint(url: string, name = "default"): TargetEndpointDef {
  return {
    name,
    preFlow: { request: [], response: [] },
    postFlow: { request: [], response: [] },
    url,
  };
}

export function matchesFlowCondition(condition: FlowCondition | undefined, method: string, path: string): boolean {
  if (!condition) return true; // no condition = always matches (used for default/fallback rules)
  if (condition.verb && condition.verb.toUpperCase() !== method.toUpperCase()) return false;
  if (condition.basePathSuffix && !path.includes(condition.basePathSuffix)) return false;
  return true;
}

// Evaluate a ProxyEndpoint's Route Rules in order (top to bottom, matching real Apigee's
// RouteRule evaluation) and return the name of the TargetEndpointDef to use for this
// request. A rule with no condition always matches, so it should be listed last as the
// default/fallback route. Falls back to the first rule's target (or "default") if the
// rule list is empty, so older proxies without explicit route rules still work.
export function selectRouteTargetName(routeRules: RouteRule[], method: string, path: string): string {
  for (const rule of routeRules) {
    if (matchesFlowCondition(rule.condition, method, path)) return rule.targetEndpoint;
  }
  return routeRules[0]?.targetEndpoint || "default";
}
