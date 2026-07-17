import express from "express";
import cors from "cors";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import environmentsRoutes from "./routes/environments.routes";
import environmentGroupsRoutes from "./routes/environmentGroups.routes";
import targetServersRoutes from "./routes/targetServers.routes";
import proxiesRoutes from "./routes/proxies.routes";
import sharedFlowsRoutes from "./routes/sharedFlows.routes";
import flowHooksRoutes from "./routes/flowHooks.routes";
import productsRoutes from "./routes/products.routes";
import developersRoutes from "./routes/developers.routes";
import appsRoutes from "./routes/apps.routes";
import kvmRoutes from "./routes/kvm.routes";
import referencesRoutes from "./routes/references.routes";
import deploymentsRoutes from "./routes/deployments.routes";
import traceRoutes from "./routes/trace.routes";
import analyticsRoutes from "./routes/analytics.routes";
import monitoringRoutes from "./routes/monitoring.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import policyCatalogRoutes from "./routes/policyCatalog.routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "apigee-simulator-backend" }));

// Public
app.use("/api/auth", authRoutes);

// Everything below requires a logged-in local user (JWT bearer token)
app.use("/api/environments", requireAuth, environmentsRoutes);
app.use("/api/environment-groups", requireAuth, environmentGroupsRoutes);
app.use("/api/target-servers", requireAuth, targetServersRoutes);
app.use("/api/proxies", requireAuth, proxiesRoutes);
app.use("/api/shared-flows", requireAuth, sharedFlowsRoutes);
app.use("/api/flow-hooks", requireAuth, flowHooksRoutes);
app.use("/api/products", requireAuth, productsRoutes);
app.use("/api/developers", requireAuth, developersRoutes);
app.use("/api/apps", requireAuth, appsRoutes);
app.use("/api/kvms", requireAuth, kvmRoutes);
app.use("/api/references", requireAuth, referencesRoutes);
app.use("/api/deployments", requireAuth, deploymentsRoutes);
app.use("/api/trace", requireAuth, traceRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/monitoring", requireAuth, monitoringRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/policy-catalog", requireAuth, policyCatalogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
