import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { CampaignPage } from "./pages/CampaignPage";
import { DashboardPage } from "./pages/DashboardPage";
import { api, services } from "./services/api";
import type { Profile } from "./types";

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

  if (!ready) {
    return <div className="grid min-h-screen place-items-center"><div className="skeleton h-10 w-10 rounded-xl" /></div>;
  }

  const shared = { profile, googleConnected, onLogout: () => void logout() };
  return (
    <Routes>
      <Route path="/" element={<DashboardPage {...shared} />} />
      <Route path="/campaign" element={<CampaignPage {...shared} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
