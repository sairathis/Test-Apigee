import client from "./client";

export const authApi = {
  login: (email: string, password: string) => client.post("/auth/login", { email, password }).then((r) => r.data),
  register: (email: string, password: string, name: string) => client.post("/auth/register", { email, password, name }).then((r) => r.data),
  me: () => client.get("/auth/me").then((r) => r.data),
};

export const dashboardApi = {
  get: () => client.get("/dashboard").then((r) => r.data),
};

export const environmentsApi = {
  list: () => client.get("/environments").then((r) => r.data),
  get: (id: string) => client.get(`/environments/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/environments", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/environments/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/environments/${id}`),
  addVirtualHost: (envId: string, data: any) => client.post(`/environments/${envId}/virtual-hosts`, data).then((r) => r.data),
  removeVirtualHost: (vhostId: string) => client.delete(`/environments/virtual-hosts/${vhostId}`),
};

export const environmentGroupsApi = {
  list: () => client.get("/environment-groups").then((r) => r.data),
  create: (data: any) => client.post("/environment-groups", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/environment-groups/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/environment-groups/${id}`),
};

export const targetServersApi = {
  list: (environmentId?: string) => client.get("/target-servers", { params: environmentId ? { environmentId } : {} }).then((r) => r.data),
  create: (data: any) => client.post("/target-servers", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/target-servers/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/target-servers/${id}`),
};

export const proxiesApi = {
  list: () => client.get("/proxies").then((r) => r.data),
  get: (id: string) => client.get(`/proxies/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/proxies", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/proxies/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/proxies/${id}`),
  getRevision: (id: string, revision: number) => client.get(`/proxies/${id}/revisions/${revision}`).then((r) => r.data),
  createRevision: (id: string) => client.post(`/proxies/${id}/revisions`).then((r) => r.data),
  updateFlows: (id: string, revision: number, data: any) => client.put(`/proxies/${id}/revisions/${revision}/flows`, data).then((r) => r.data),
  importOpenApi: (id: string, revision: number, spec: any) => client.post(`/proxies/${id}/revisions/${revision}/import-openapi`, { spec }).then((r) => r.data),
  addPolicy: (id: string, revision: number, data: any) => client.post(`/proxies/${id}/revisions/${revision}/policies`, data).then((r) => r.data),
  updatePolicy: (policyId: string, data: any) => client.put(`/proxies/policies/${policyId}`, data).then((r) => r.data),
  removePolicy: (policyId: string) => client.delete(`/proxies/policies/${policyId}`),
};

export const sharedFlowsApi = {
  list: () => client.get("/shared-flows").then((r) => r.data),
  get: (id: string) => client.get(`/shared-flows/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/shared-flows", data).then((r) => r.data),
  remove: (id: string) => client.delete(`/shared-flows/${id}`),
  createRevision: (id: string) => client.post(`/shared-flows/${id}/revisions`).then((r) => r.data),
  addPolicy: (id: string, revision: number, data: any) => client.post(`/shared-flows/${id}/revisions/${revision}/policies`, data).then((r) => r.data),
  removePolicy: (policyId: string) => client.delete(`/shared-flows/policies/${policyId}`),
};

export const flowHooksApi = {
  list: () => client.get("/flow-hooks").then((r) => r.data),
  upsert: (data: any) => client.post("/flow-hooks", data).then((r) => r.data),
  remove: (id: string) => client.delete(`/flow-hooks/${id}`),
};

export const productsApi = {
  list: () => client.get("/products").then((r) => r.data),
  get: (id: string) => client.get(`/products/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/products", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/products/${id}`),
};

export const developersApi = {
  list: () => client.get("/developers").then((r) => r.data),
  get: (id: string) => client.get(`/developers/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/developers", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/developers/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/developers/${id}`),
};

export const appsApi = {
  list: () => client.get("/apps").then((r) => r.data),
  get: (id: string) => client.get(`/apps/${id}`).then((r) => r.data),
  create: (data: any) => client.post("/apps", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/apps/${id}`, data).then((r) => r.data),
  regenerateKeys: (id: string) => client.post(`/apps/${id}/regenerate-keys`).then((r) => r.data),
  remove: (id: string) => client.delete(`/apps/${id}`),
};

export const kvmApi = {
  list: () => client.get("/kvms").then((r) => r.data),
  create: (data: any) => client.post("/kvms", data).then((r) => r.data),
  remove: (id: string) => client.delete(`/kvms/${id}`),
  addEntry: (kvmId: string, data: any) => client.post(`/kvms/${kvmId}/entries`, data).then((r) => r.data),
  updateEntry: (entryId: string, data: any) => client.put(`/kvms/entries/${entryId}`, data).then((r) => r.data),
  removeEntry: (entryId: string) => client.delete(`/kvms/entries/${entryId}`),
};

export const referencesApi = {
  list: () => client.get("/references").then((r) => r.data),
  create: (data: any) => client.post("/references", data).then((r) => r.data),
  update: (id: string, data: any) => client.put(`/references/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/references/${id}`),
};

export const deploymentsApi = {
  list: () => client.get("/deployments").then((r) => r.data),
  deploy: (data: any) => client.post("/deployments", data).then((r) => r.data),
  undeploy: (id: string) => client.post(`/deployments/${id}/undeploy`).then((r) => r.data),
};

export const traceApi = {
  run: (data: any) => client.post("/trace/run", data).then((r) => r.data),
  history: (proxyName?: string) => client.get("/trace/history", { params: proxyName ? { proxyName } : {} }).then((r) => r.data),
};

export const analyticsApi = {
  summary: (params: { range?: string; environmentName?: string; proxyName?: string }) => client.get("/analytics/summary", { params }).then((r) => r.data),
};

export const monitoringApi = {
  get: () => client.get("/monitoring").then((r) => r.data),
  simulateAlert: (data: any) => client.post("/monitoring/alerts/simulate", data).then((r) => r.data),
  resolveAlert: (id: string) => client.post(`/monitoring/alerts/${id}/resolve`).then((r) => r.data),
};

export const policyCatalogApi = {
  list: () => client.get("/policy-catalog").then((r) => r.data),
};
