import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Store token and clear URL params
    // The login function in AuthContext stores the token and triggers /auth/me
    // We temporarily store it and let AuthContext rehydrate
    localStorage.setItem("accessToken", token);

    // Clear the token from the URL so it's not bookmarkable
    window.history.replaceState({}, document.title, "/auth-success");

    // Small delay to let AuthContext pick up the token via its useEffect
    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 800);

    return () => clearTimeout(timer);
  }, []);

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
          <h2 className="text-xl font-bold text-foreground">Signing you in…</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Redirecting to your dashboard
          </p>
        </div>
      </div>
    </div>
  );
};
