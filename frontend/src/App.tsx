import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Landing } from "./components/Landing";
import { api, services } from "./services/api";
import { WorkspaceProvider } from "./state/WorkspaceContext";
import type { Profile } from "./types";

const OverviewPage = lazy(() => import("./pages/ProductPages").then((module) => ({ default: module.OverviewPage })));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage").then((module) => ({ default: module.CampaignsPage })));
const FunnelsPage = lazy(() => import("./pages/ProductPages").then((module) => ({ default: module.FunnelsPage })));
const ManageAppsPage = lazy(() => import("./pages/ProductPages").then((module) => ({ default: module.ManageAppsPage })));
type WorkspaceProps = { profile: Profile; googleConnected: boolean; onLogout: () => void };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    services.me().then((session) => {
      setProfile(session.profile);
      setGoogleConnected(session.googleConnected);
    }).catch(() => {
      setProfile(null);
      setGoogleConnected(false);
    }).finally(() => setReady(true));
  }, []);

  async function logout() {
    await api.post("/auth/logout");
    setProfile(null);
    setGoogleConnected(false);
    navigate("/");
  }

  if (!ready) return <div className="grid min-h-screen place-items-center bg-app"><div className="skeleton h-10 w-10 rounded-xl" /></div>;

  return (
    <WorkspaceProvider>
      {!profile ? <AppShell profile={null} onLogout={() => void logout()}><Landing /></AppShell> : <AuthenticatedRoutes profile={profile} googleConnected={googleConnected} onLogout={() => void logout()} />}
    </WorkspaceProvider>
  );
}

function AuthenticatedRoutes(props: WorkspaceProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app p-8"><div className="skeleton h-9 w-48" /><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage {...props} />} />
        <Route path="/campaigns" element={<CampaignsPage {...props} />} />
        <Route path="/funnels" element={<FunnelsPage {...props} />} />
        <Route path="/apps" element={<ManageAppsPage {...props} />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </Suspense>
  );
}
