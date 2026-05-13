import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";

interface UserData {
  name: string;
  email: string;
}
// 1. The Login Page
function Login() {
  // We don't use fetch/axios here. We must navigate away from React to the Express backend
  // so Passport can redirect the user to the actual Google login screen.
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8079/api/auth/google";
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>MatrixPoll Login</h1>
      <button onClick={handleGoogleLogin} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Sign in with Google
      </button>
    </div>
  );
}

// 2. The Callback Receiver (Where Express sends the user after login)
function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the token from the URL (e.g., http://localhost:5173/auth-success?token=eyJhb...)
    const token = searchParams.get("token");

    if (token) {
      // Save it to localStorage (or your Zustand store)
      localStorage.setItem("accessToken", token);
      // Redirect to the dashboard to clean up the URL
      navigate("/dashboard");
    } else {
      // If there's no token, something went wrong
      navigate("/");
    }
  }, [searchParams, navigate]);

  return <p>Authenticating...</p>;
}

// 3. A Protected Dashboard to test if the token works
function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/");
      return;
    }

    // Test the /me route to prove the JWT works
    fetch("http://localhost:8079/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/");
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Dashboard</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {user ? (
        <div>
          <p>Welcome back, <strong>{user.name}</strong>!</p>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}