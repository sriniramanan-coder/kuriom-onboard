import { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails
} from "amazon-cognito-identity-js";

const AuthContext = createContext(null);

const POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-2_17SEl3Sao";
const CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID || "1s06131r2mmd6vstit5ie2fs4";

const userPool = new CognitoUserPool({
  UserPoolId: POOL_ID,
  ClientId: CLIENT_ID,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("kuriom_token") || null);
  const tokenRef = useRef(sessionStorage.getItem("kuriom_token") || null);
  const [loading, setLoading] = useState(true);
  const [cognitoUser, setCognitoUser] = useState(null);
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [userAttributes, setUserAttributes] = useState(null);

  useEffect(() => {
    const existing = sessionStorage.getItem("kuriom_token");
    if (existing) {
      try {
        const claims = JSON.parse(atob(existing.split(".")[1]));
        if (claims.exp && claims.exp * 1000 > Date.now()) {
          tokenRef.current = existing;
          setUser({
            email: claims.email || "",
            role: claims["custom:role"] || "viewer",
            portals: claims["custom:portals"] || "app",
            tenant_id: claims["custom:tenant_id"] || "default"
          });
        } else {
          sessionStorage.removeItem("kuriom_token");
          setToken(null);
          tokenRef.current = null;
        }
      } catch (e) {
        sessionStorage.removeItem("kuriom_token");
      }
    }
    setLoading(false);
  }, []);

  function signIn(email, password, onError, onNewPassword) {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const cu = new CognitoUser({ Username: email, Pool: userPool });
    setCognitoUser(cu);

    cu.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const claims = JSON.parse(atob(idToken.split(".")[1]));
        sessionStorage.setItem("kuriom_token", idToken);
        setToken(idToken);
        tokenRef.current = idToken;
        setUser({
          email: claims.email || "",
          role: claims["custom:role"] || "viewer",
          portals: claims["custom:portals"] || "app",
          tenant_id: claims["custom:tenant_id"] || "default"
        });
        setNewPasswordRequired(false);
      },
      onFailure: (err) => {
        onError && onError(err.message || "Sign in failed");
      },
      newPasswordRequired: (attrs) => {
        setNewPasswordRequired(true);
        setUserAttributes(attrs);
        onNewPassword && onNewPassword();
      }
    });
  }

  function completeNewPassword(newPassword, onError) {
    if (!cognitoUser) return;
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const claims = JSON.parse(atob(idToken.split(".")[1]));
        sessionStorage.setItem("kuriom_token", idToken);
        setToken(idToken);
        tokenRef.current = idToken;
        setUser({
          email: claims.email || "",
          role: claims["custom:role"] || "viewer",
          portals: claims["custom:portals"] || "app",
          tenant_id: claims["custom:tenant_id"] || "default"
        });
        setNewPasswordRequired(false);
      },
      onFailure: (err) => {
        onError && onError(err.message || "Password change failed");
      }
    });
  }

  function logout() {
    const cu = userPool.getCurrentUser();
    if (cu) cu.signOut();
    sessionStorage.removeItem("kuriom_token");
    setUser(null);
    setToken(null);
    tokenRef.current = null;
    setNewPasswordRequired(false);
  }

  function apiHeaders() {
    const t = tokenRef.current || token;
    if (t) return { "Authorization": `Bearer ${t}` };
    const apiKey = import.meta.env.VITE_KURIOM_API_KEY || "";
    return { "X-Kuriom-API-Key": apiKey };
  }

  return (
    <AuthContext.Provider value={{
      user, token, tokenRef, loading, logout, apiHeaders,
      signIn, completeNewPassword, newPasswordRequired, cognitoUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const { signIn, completeNewPassword, newPasswordRequired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("login"); // login | newpassword

  const NAVY = "#0B0F19";
  const TEAL = "#028090";
  const WHITE = "#F0F4F8";
  const MUTED = "#4A6080";
  const MONO = "'Space Mono', monospace";
  const SERIF = "Georgia, serif";

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    signIn(
      email, password,
      (err) => { setError(err); setLoading(false); },
      () => { setStep("newpassword"); setLoading(false); }
    );
  }

  async function handleNewPassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    setLoading(true);
    completeNewPassword(
      newPassword,
      (err) => { setError(err); setLoading(false); }
    );
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 6,
    border: `1px solid ${MUTED}44`, background: "#111827",
    color: WHITE, fontFamily: MONO, fontSize: 13,
    outline: "none", boxSizing: "border-box"
  };

  const btnStyle = (disabled) => ({
    width: "100%", padding: "13px", borderRadius: 6,
    background: disabled ? MUTED : TEAL, color: WHITE,
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: MONO, fontSize: 13, letterSpacing: 1,
    fontWeight: 700, marginTop: 8
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: NAVY }}>
      <div style={{ width: 360, padding: "40px 36px", background: "#111827",
        borderRadius: 8, border: `1px solid ${MUTED}33`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700,
            color: WHITE, letterSpacing: 2, marginBottom: 6 }}>KURIOM</div>
          <div style={{ fontFamily: SERIF, fontSize: 12, color: MUTED }}>
            Sequence Knowledge Authorization
          </div>
        </div>

        {step === "login" ? (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED,
                letterSpacing: 2, marginBottom: 6 }}>EMAIL</div>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="you@organisation.com"
                style={inputStyle}
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED,
                letterSpacing: 2, marginBottom: 6 }}>PASSWORD</div>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div style={{ color: "#EF4444", fontFamily: MONO, fontSize: 11,
                marginTop: 8, marginBottom: 4 }}>{error}</div>
            )}
            <button type="submit" disabled={loading || !email || !password}
              style={btnStyle(loading || !email || !password)}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNewPassword}>
            <div style={{ fontFamily: SERIF, fontSize: 13, color: WHITE,
              marginBottom: 20, lineHeight: 1.6 }}>
              Please set a permanent password to continue.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED,
                letterSpacing: 2, marginBottom: 6 }}>NEW PASSWORD</div>
              <input
                type="password" value={newPassword} required
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 12 characters"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED,
                letterSpacing: 2, marginBottom: 6 }}>CONFIRM PASSWORD</div>
              <input
                type="password" value={confirmPassword} required
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div style={{ color: "#EF4444", fontFamily: MONO, fontSize: 11,
                marginTop: 8, marginBottom: 4 }}>{error}</div>
            )}
            <button type="submit" disabled={loading || !newPassword || !confirmPassword}
              style={btnStyle(loading || !newPassword || !confirmPassword)}>
              {loading ? "SETTING PASSWORD..." : "SET PASSWORD"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 24,
          fontFamily: MONO, fontSize: 10, color: `${MUTED}88`, letterSpacing: 1 }}>
          Patent Pending · kuriom.ai
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0D1829", color: "#A8C4E0",
        fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
        KURIOM
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (user.portals === "app") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0B0F19", color: "#EF4444",
        fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
        Access denied. Your account is configured for app.kuriom.ai only.
      </div>
    );
  }

  return children;
}
