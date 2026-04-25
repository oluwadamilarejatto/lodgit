import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ── Helpers ──────────────────────────────────────────────────────────────
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ── Auth Screen ───────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailAuth = async () => {
    setError(""); setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
  };

  const inp = { width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: "12px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#080F1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora','Segoe UI',sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#FF6B35", letterSpacing: "-2px" }}>Lodg</span>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#F1F5F9", letterSpacing: "-2px" }}>it</span>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF6B35", marginLeft: 2 }} />
          </div>
          <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Never drop a request again</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0D1B2A", borderRadius: 20, padding: 28, border: "1px solid #1E293B" }}>
          <h2 style={{ color: "#F1F5F9", fontSize: 20, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ color: "#475569", fontSize: 13, margin: "0 0 24px" }}>
            {mode === "login" ? "Sign in to your workspace" : "Start managing requests today"}
          </p>

          {/* Google Button */}
          <button onClick={handleGoogle} style={{ width: "100%", padding: "12px 0", background: "#fff", border: "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 20, fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#1E293B" }} />
            <span style={{ color: "#334155", fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#1E293B" }} />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inp} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inp} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={inp} />
          </div>

          {error && <p style={{ color: "#FF4444", fontSize: 12, margin: "0 0 14px", textAlign: "center" }}>{error}</p>}
          {message && <p style={{ color: "#00C896", fontSize: 12, margin: "0 0 14px", textAlign: "center" }}>{message}</p>}

          <button
            onClick={handleEmailAuth}
            disabled={loading}
            style={{ width: "100%", padding: 13, background: "linear-gradient(135deg,#FF6B35,#FF4D8F)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          <p style={{ textAlign: "center", marginTop: 18, color: "#475569", fontSize: 13 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ background: "none", border: "none", color: "#FF6B35", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Workspace Screen ──────────────────────────────────────────────────────
function WorkspaceScreen({ user, onWorkspaceReady }) {
  const [mode, setMode] = useState("choose"); // choose | create | join
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState("team"); // team | personal
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setLoading(true); setError("");
    const code = generateCode();
    const { data, error } = await supabase.from("workspaces").insert([{
      name: workspaceName.trim(),
      type: workspaceType,
      code,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    }]).select();

    if (error) { setError(error.message); setLoading(false); return; }

    const workspace = data[0];
    await supabase.from("workspace_members").insert([{
      workspaceId: workspace.id,
      userId: user.id,
      name: user.user_metadata?.full_name || user.email,
      email: user.email,
      role: "admin",
      joinedAt: new Date().toISOString(),
    }]);

    onWorkspaceReady(workspace);
    setLoading(false);
  };

  const joinWorkspace = async () => {
    if (!joinCode.trim()) return;
    setLoading(true); setError("");
    const { data, error } = await supabase.from("workspaces").select("*").eq("code", joinCode.trim().toUpperCase());
    if (error || !data.length) { setError("Invalid code. Check with your team lead."); setLoading(false); return; }

    const workspace = data[0];
    await supabase.from("workspace_members").insert([{
      workspaceId: workspace.id,
      userId: user.id,
      name: user.user_metadata?.full_name || user.email,
      email: user.email,
      role: "member",
      joinedAt: new Date().toISOString(),
    }]);

    onWorkspaceReady(workspace);
    setLoading(false);
  };

  const inp = { width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: "12px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#080F1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora','Segoe UI',sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#FF6B35", letterSpacing: "-2px" }}>Lodg</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#F1F5F9", letterSpacing: "-2px" }}>it</span>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B35", marginLeft: 2 }} />
          </div>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
            Welcome, {user.user_metadata?.full_name?.split(" ")[0] || "there"}! 👋
          </p>
        </div>

        <div style={{ background: "#0D1B2A", borderRadius: 20, padding: 28, border: "1px solid #1E293B" }}>
          {mode === "choose" && (
            <>
              <h2 style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Set up your workspace</h2>
              <p style={{ color: "#475569", fontSize: 13, margin: "0 0 24px" }}>How do you want to use Lodgit?</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button onClick={() => setMode("create")} style={{ padding: 18, background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, textAlign: "left", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#FF6B35"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#1E293B"}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🏢</div>
                  <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Create a Workspace</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>For your team or personal use. You'll get an invite code to share.</div>
                </button>

                <button onClick={() => setMode("join")} style={{ padding: 18, background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, textAlign: "left", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#3B9EFF"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#1E293B"}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🔗</div>
                  <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Join a Workspace</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>Your team lead shared an invite code with you.</div>
                </button>
              </div>
            </>
          )}

          {mode === "create" && (
            <>
              <button onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16, fontFamily: "inherit" }}>← Back</button>
              <h2 style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>Create Workspace</h2>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Workspace Name</div>
                <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="e.g. First Bank Ikeja, My Clinic, Zenith Logistics" style={inp} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Type</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["team", "👥 Team", "For multiple people"], ["personal", "👤 Personal", "Just for you"]].map(([val, label, sub]) => (
                    <button key={val} onClick={() => setWorkspaceType(val)} style={{ flex: 1, padding: "10px 8px", background: workspaceType === val ? "#FF6B3522" : "#0F172A", border: `1.5px solid ${workspaceType === val ? "#FF6B35" : "#1E293B"}`, borderRadius: 10, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ color: workspaceType === val ? "#FF6B35" : "#F1F5F9", fontWeight: 700, fontSize: 12 }}>{label}</div>
                      <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: "#FF4444", fontSize: 12, margin: "0 0 14px" }}>{error}</p>}

              <button onClick={createWorkspace} disabled={loading || !workspaceName.trim()} style={{ width: "100%", padding: 13, background: workspaceName.trim() ? "linear-gradient(135deg,#FF6B35,#FF4D8F)" : "#1E293B", border: "none", borderRadius: 10, color: workspaceName.trim() ? "#fff" : "#334155", fontWeight: 800, fontSize: 14, cursor: workspaceName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {loading ? "Creating..." : "Create Workspace →"}
              </button>
            </>
          )}

          {mode === "join" && (
            <>
              <button onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16, fontFamily: "inherit" }}>← Back</button>
              <h2 style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Join a Workspace</h2>
              <p style={{ color: "#475569", fontSize: 13, margin: "0 0 20px" }}>Enter the invite code from your team lead</p>

              <div style={{ marginBottom: 20 }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter 6-digit code e.g. AB12CD" style={{ ...inp, textAlign: "center", fontSize: 20, fontWeight: 800, letterSpacing: 4 }} maxLength={6} />
              </div>

              {error && <p style={{ color: "#FF4444", fontSize: 12, margin: "0 0 14px" }}>{error}</p>}

              <button onClick={joinWorkspace} disabled={loading || joinCode.length < 6} style={{ width: "100%", padding: 13, background: joinCode.length >= 6 ? "linear-gradient(135deg,#3B9EFF,#A855F7)" : "#1E293B", border: "none", borderRadius: 10, color: joinCode.length >= 6 ? "#fff" : "#334155", fontWeight: 800, fontSize: 14, cursor: joinCode.length >= 6 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {loading ? "Joining..." : "Join Workspace →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Workspace Code Display ────────────────────────────────────────────────
export function WorkspaceCodeBanner({ workspace, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(workspace.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: "#FF6B3511", border: "1px solid #FF6B3533", borderRadius: 12, padding: "14px 16px", margin: "0 14px 12px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#FF6B35", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Your Invite Code</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#F1F5F9", letterSpacing: 4 }}>{workspace.code}</div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Share this with your team to join {workspace.name}</div>
      </div>
      <button onClick={copy} style={{ background: "#FF6B35", border: "none", borderRadius: 8, color: "#fff", padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ── Auth Provider (main export) ───────────────────────────────────────────
export default function LodgitAuth({ children }) {
  const [session, setSession] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [checkingWorkspace, setCheckingWorkspace] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkWorkspace(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkWorkspace(session.user.id);
      else { setWorkspace(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkWorkspace = async (userId) => {
      setCheckingWorkspace(true);
      const cached = localStorage.getItem("lodgit_workspace");
      if (cached) {
        setWorkspace(JSON.parse(cached));
        setCheckingWorkspace(false);
        setAuthLoading(false);
        return;
      }
      const { data } = await supabase.from("workspace_members").select("workspaceId").eq("userId", userId).limit(1);
      if (data && data.length > 0) {
        const { data: ws } = await supabase.from("workspaces").select("*").eq("id", data[0].workspaceId).single();
        setWorkspace(ws);
        localStorage.setItem("lodgit_workspace", JSON.stringify(ws));
      }
      setCheckingWorkspace(false);
      setAuthLoading(false);
    };

  const handleWorkspaceReady = (ws) => {
    setWorkspace(ws);
    localStorage.setItem("lodgit_workspace", JSON.stringify(ws));
  };

const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("lodgit_workspace");
    setWorkspace(null);
  };

  if (authLoading || checkingWorkspace) {
    return (
      <div style={{ minHeight: "100vh", background: "#080F1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Sora','Segoe UI',sans-serif" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#FF6B35", letterSpacing: "-2px", marginBottom: 12 }}>Lodgit</div>
        <div style={{ color: "#334155", fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  if (!session) return <AuthScreen onAuth={setSession} />;
  if (!workspace) return <WorkspaceScreen user={session.user} onWorkspaceReady={handleWorkspaceReady} />;

  return children({ session, workspace, onSignOut: handleSignOut });
}
