// ====================================================================
// Index - الصفحة الرئيسية: تعرض Splash مرة واحدة ثم تحوّل لـ /chat
// ====================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Splash from "@/components/Splash";

const SPLASH_KEY = "dardashati_splash_seen";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_KEY));

  useEffect(() => {
    if (loading || showSplash) return;
    if (user) navigate("/chat", { replace: true });
    else navigate("/welcome", { replace: true });
  }, [user, loading, showSplash, navigate]);

  if (showSplash) {
    return <Splash onDone={() => { sessionStorage.setItem(SPLASH_KEY, "1"); setShowSplash(false); }} />;
  }
  return null;
}
