import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";

export const AuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        localStorage.setItem("accessToken", token);
        window.history.replaceState({}, document.title, "/auth-success");
        const { data } = await api.get("/auth/me");
        if (cancelled) return;
        login(token, data.user);
        navigate("/dashboard", { replace: true });
      } catch {
        if (cancelled) return;
        localStorage.removeItem("accessToken");
        setMessage("Could not finish sign-in. Redirecting…");
        navigate("/login?error=oauth_failed", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Spinner */}
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/10" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{message}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Redirecting to your dashboard
          </p>
        </div>
      </div>
    </div>
  );
};
