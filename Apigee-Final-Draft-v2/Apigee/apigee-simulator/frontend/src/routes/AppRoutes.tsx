import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import ProxyList from "../pages/Proxies/ProxyList";
import ProxyDetail from "../pages/Proxies/ProxyDetail";
import SharedFlowList from "../pages/SharedFlows/SharedFlowList";
import SharedFlowDetail from "../pages/SharedFlows/SharedFlowDetail";
import ProductList from "../pages/Products/ProductList";
import DeveloperList from "../pages/Developers/DeveloperList";
import AppList from "../pages/Apps/AppList";
import EnvironmentList from "../pages/Environments/EnvironmentList";
import EnvironmentGroupList from "../pages/EnvironmentGroups/EnvironmentGroupList";
import TargetServerList from "../pages/TargetServers/TargetServerList";
import KvmList from "../pages/Kvm/KvmList";
import ReferenceList from "../pages/References/ReferenceList";
import FlowHookList from "../pages/FlowHooks/FlowHookList";
import DeploymentList from "../pages/Deployments/DeploymentList";
import TracePage from "../pages/Trace/TracePage";
import AnalyticsPage from "../pages/Analytics/AnalyticsPage";
import MonitoringPage from "../pages/Monitoring/MonitoringPage";
import SettingsPage from "../pages/Settings/SettingsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/proxies" element={<ProxyList />} />
          <Route path="/proxies/:id" element={<ProxyDetail />} />
          <Route path="/shared-flows" element={<SharedFlowList />} />
          <Route path="/shared-flows/:id" element={<SharedFlowDetail />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/developers" element={<DeveloperList />} />
          <Route path="/apps" element={<AppList />} />
          <Route path="/environments" element={<EnvironmentList />} />
          <Route path="/environment-groups" element={<EnvironmentGroupList />} />
          <Route path="/target-servers" element={<TargetServerList />} />
          <Route path="/kvm" element={<KvmList />} />
          <Route path="/references" element={<ReferenceList />} />
          <Route path="/flow-hooks" element={<FlowHookList />} />
          <Route path="/deployments" element={<DeploymentList />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
