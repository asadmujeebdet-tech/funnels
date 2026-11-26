import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { api, services } from "./services/api";
import type { Profile } from "./types";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    services.me().then((session) => {
      setProfile(session.profile);
      setGoogleConnected(session.googleConnected);
    }).catch(() => {
      setProfile(null);
      setGoogleConnected(false);
    });
  }, []);

  async function logout() {
    await api.post("/auth/logout");
    setProfile(null);
    setGoogleConnected(false);
    navigate("/");
  }

  return (
    <Routes>
      <Route path="*" element={<DashboardPage profile={profile} googleConnected={googleConnected} onLogout={() => void logout()} />} />
    </Routes>
  );
}
