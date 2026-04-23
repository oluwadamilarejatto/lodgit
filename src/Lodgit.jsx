import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const SLA_OPTIONS = [
  { label: "1 Hour",   value: 60 },
  { label: "2 Hours",  value: 120 },
  { label: "4 Hours",  value: 240 },
  { label: "Same Day", value: 480 },
  { label: "1 Day",    value: 1440 },
  { label: "3 Days",   value: 4320 },
  { label: "1 Week",   value: 10080 },
];

const STATUSES = {
  open:          { label: "Open",        color: "#FF6B35" },
  "in-progress": { label: "In Progress", color: "#3B9EFF" },
  done:          { label: "Done",        color: "#00C896" },
};

const PRIORITIES = {
  urgent: { label: "Urgent", color: "#FF4444" },
  normal: { label: "Normal", color: "#3B9EFF" },
  low:    { label: "Low",    color: "#94A3B8" },
};

const SEED_ME = { id: 1, name: "Me", role: "Team", avatar: "ME" };

const SEED_TEAM = [];
const SEED = [];

// ── Helpers ──────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

const acColor = (id) => ["#FF6B35","#3B9EFF","#00C896","#FF4D8F","#A855F7","#F59E0B"][id % 6];

const getSLALabel = (mins) => SLA_OPTIONS.find(s => s.value === mins)?.label || `${mins}m`;

const getSLAStatus = (req) => {
  if (req.status === "done") return null;
  if (!req.slaMinutes || !req.createdAt) return null;
  const elapsed = (Date.now() - new Date(req.createdAt)) / 60000;
  const pct = Math.min((elapsed / req.slaMinutes) * 100, 100);
  if (pct >= 100) return { status: "breached", pct: 100, label: "SLA Breached", color: "#FF4444" };
  if (pct >= 75)  return { status: "warning",  pct,     label: "Due Soon",     color: "#FFB347" };
  return { status: "ok", pct, label: getSLALabel(req.slaMinutes), color: "#00C896" };
};

const getTimeLeft = (req) => {
  if (!req.slaMinutes || !req.createdAt || req.status === "done") return null;
  const left = new Date(req.createdAt).getTime() + req.slaMinutes * 60000 - Date.now();
  if (left <= 0) return "Overdue";
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h/24)}d left`;
  if (h > 0)  return `${h}h ${m}m left`;
  return `${m}m left`;
};

// ── Hooks ────────────────────────────────────────────────────────────────
function useNotifications() {
  const [inApp, setInApp] = useState([]);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") setGranted(true);
  }, []);

  const requestPerm = async () => {
    if (!("Notification" in window)) return;
    const r = await Notification.requestPermission();
    setGranted(r === "granted");
  };

  const notify = useCallback((title, body) => {
    setInApp(p => [{ id: Date.now(), title, body, at: new Date().toISOString() }, ...p.slice(0, 9)]);
    if (granted) new Notification(title, { body });
  }, [granted]);

  const dismiss = (id) => setInApp(p => p.filter(n => n.id !== id));
  const clearAll = () => setInApp([]);
  return { inApp, notify, dismiss, clearAll, granted, requestPerm };
}

function useSLAWatcher(requests, notify) {
  const fired = useRef(new Set());
  useEffect(() => {
    const check = () => {
      requests.forEach(r => {
        if (r.status === "done") return;
        const s = getSLAStatus(r);
        if (!s) return;
        if (s.status === "breached" && !fired.current.has(`b${r.id}`)) {
          notify("🚨 SLA Breached", `${r.clientName}'s request exceeded its timeframe`);
          fired.current.add(`b${r.id}`);
        } else if (s.status === "warning" && !fired.current.has(`w${r.id}`)) {
          notify("⚠️ Due Soon", `${r.clientName}'s request is almost at deadline`);
          fired.current.add(`w${r.id}`);
        }
        if (r.reminderAt && !fired.current.has(`rem${r.id}`) && new Date(r.reminderAt) <= new Date()) {
          notify("🔔 Reminder", `Follow up on ${r.clientName}'s request`);
          fired.current.add(`rem${r.id}`);
        }
      });
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [requests, notify]);
}

function useVoiceRecorder(onTranscript) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const mr = useRef(null), chunks = useRef([]), timer = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mr.current = new MediaRecorder(stream);
      chunks.current = [];
      mr.current.ondataavailable = e => chunks.current.push(e.data);
      mr.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        onTranscript("🎙 Voice note saved — transcription available when connected to Whisper API.");
      };
      mr.current.start(); setRecording(true); setDuration(0);
      timer.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stop = () => {
    if (mr.current && recording) { mr.current.stop(); setRecording(false); clearInterval(timer.current); }
  };

  const reset = () => { setAudioUrl(null); setDuration(0); };
  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  return { recording, audioUrl, duration, fmt, start, stop, reset };
}

// ── UI Atoms ─────────────────────────────────────────────────────────────
function Av({ user, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: acColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
      {user.avatar}
    </div>
  );
}

function Chip({ label, color, small }) {
  return (
    <span style={{ padding: small ? "2px 7px" : "4px 10px", borderRadius: 99, background: color + "18", color, fontSize: small ? 10 : 11, fontWeight: 700, border: `1px solid ${color}33`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SLABar({ req }) {
  const s = getSLAStatus(req);
  if (!s) return null;
  const left = getTimeLeft(req);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</span>
        <span style={{ fontSize: 10, color: s.status === "breached" ? "#FF4444" : "#64748B", fontWeight: 600 }}>{left}</span>
      </div>
      <div style={{ height: 3, background: "#0F172A", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 2, transition: "width 1s" }} />
      </div>
    </div>
  );
}

function Toast({ notif, onDismiss }) {
  useEffect(() => { const t = setTimeout(() => onDismiss(notif.id), 5000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 10, boxShadow: "0 8px 24px #00000066", animation: "slideIn 0.3s ease" }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{notif.title}</div>
        <div style={{ color: "#64748B", fontSize: 12 }}>{notif.body}</div>
      </div>
      <button onClick={() => onDismiss(notif.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

function NotifPanel({ notifs, onDismiss, onClear, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "85%", maxWidth: 340, background: "#0D1B2A", padding: 20, overflowY: "auto", boxShadow: "-8px 0 32px #00000066" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#F1F5F9", fontSize: 15, fontWeight: 800 }}>Notifications</h3>
          {notifs.length > 0 && <button onClick={onClear} style={{ background: "none", border: "none", color: "#64748B", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Clear all</button>}
        </div>
        {notifs.length === 0
          ? <p style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "40px 0" }}>All clear 🎉</p>
          : notifs.map(n => (
            <div key={n.id} style={{ background: "#16213E", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{n.title}</div>
              <div style={{ color: "#64748B", fontSize: 12, marginBottom: 4 }}>{n.body}</div>
              <div style={{ color: "#334155", fontSize: 10 }}>{timeAgo(n.at)}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function Card({ req, users, me, onTap, onCycle, onPickUp }) {
  const owner = users.find(u => u.id === req.assignedTo);
  const sla = getSLAStatus(req);
  return (
    <div
      onClick={() => onTap(req)}
      style={{ background: "#16213E", border: `1px solid ${sla?.status === "breached" ? "#FF444433" : "#ffffff0a"}`, borderRadius: 14, padding: 16, marginBottom: 10, cursor: "pointer", position: "relative", overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px #00000055"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: PRIORITIES[req.priority].color, borderRadius: "14px 0 0 14px" }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
          <div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 0.8, marginBottom: 1 }}>CLIENT</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#F1F5F9" }}>{req.clientName}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); onCycle(req.id); }} style={{ padding: "3px 10px", borderRadius: 99, border: "none", background: STATUSES[req.status].color + "20", color: STATUSES[req.status].color, fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
            {STATUSES[req.status].label}
          </button>
        </div>
        <p style={{ margin: "0 0 10px", color: req.status === "done" ? "#334155" : "#94A3B8", fontSize: 13, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {req.audioUrl && "🎙 "}{req.request}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <Chip label={PRIORITIES[req.priority].label} color={PRIORITIES[req.priority].color} small />
          {req.slaMinutes && <Chip label={getSLALabel(req.slaMinutes)} color="#64748B" small />}
          {sla?.status === "breached" && <Chip label="⚠ Breached" color="#FF4444" small />}
          {sla?.status === "warning"  && <Chip label="⏰ Due Soon" color="#FFB347" small />}
          <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>{timeAgo(req.createdAt)}</span>
          {owner
            ? <Av user={owner} size={22} />
            : <button onClick={e => { e.stopPropagation(); onPickUp(req.id); }} style={{ padding: "3px 9px", borderRadius: 99, background: "#3B9EFF22", color: "#3B9EFF", border: "1px solid #3B9EFF44", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Pick up</button>
          }
        </div>
        <SLABar req={req} />
      </div>
    </div>
  );
}

function LogModal({ users, me, onClose, onSave, notify }) {
  const [client, setClient] = useState("");
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignTo, setAssignTo] = useState(me.id);
  const [sla, setSla] = useState(480);
  const [remOffset, setRemOffset] = useState("");
  const [transcript, setTranscript] = useState(null);
  const { recording, audioUrl, duration, fmt, start, stop, reset } = useVoiceRecorder(setTranscript);

  const canSubmit = client.trim() && (text.trim() || audioUrl);

  const submit = () => {
    if (!canSubmit) return;
    let reminderAt = null;
    if (remOffset && sla) reminderAt = new Date(Date.now() + sla * 60000 - Number(remOffset) * 60000).toISOString();
    onSave({ clientName: client.trim(), request: text.trim() || transcript || "Voice note", priority, assignedTo: Number(assignTo), slaMinutes: Number(sla), reminderAt, audioUrl, transcript, status: "open", createdBy: me.id, createdAt: new Date().toISOString(), note: "" });
    notify("✅ Request Lodged", `${client.trim()} — due in ${getSLALabel(Number(sla))}`);
    onClose();
  };

  const inp = { width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: "11px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const lbl = { fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6, fontWeight: 700 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0D1B2A", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 520, padding: "24px 20px 36px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#1E293B", borderRadius: 2, margin: "0 auto 22px" }} />
        <h3 style={{ color: "#F1F5F9", margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>Lodge a Request</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Client Name *</label>
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Mrs. Afolabi, Zenith Logistics" style={inp} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Request *</label>
          <div style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, marginBottom: 10 }}>🎙 VOICE NOTE</div>
            {!audioUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={recording ? stop : start} style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: recording ? "#FF4444" : "#FF6B35", color: "#fff", fontSize: 17, cursor: "pointer", flexShrink: 0, boxShadow: recording ? "0 0 0 8px #FF444422" : "none", transition: "box-shadow 0.3s" }}>
                  {recording ? "⏹" : "⏺"}
                </button>
                <div>
                  <div style={{ color: recording ? "#FF4444" : "#64748B", fontSize: 13, fontWeight: 600 }}>{recording ? `Recording… ${fmt(duration)}` : "Tap to record"}</div>
                  <div style={{ color: "#334155", fontSize: 11 }}>Speak the client's request</div>
                </div>
              </div>
            ) : (
              <div>
                <audio src={audioUrl} controls style={{ width: "100%", marginBottom: 6 }} />
                {transcript && <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 6px", fontStyle: "italic" }}>{transcript}</p>}
                <button onClick={() => { reset(); setTranscript(null); }} style={{ fontSize: 11, color: "#FF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕ Remove</button>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", color: "#1E293B", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>— OR TYPE —</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe the request…" rows={2} style={{ ...inp, resize: "none" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Priority</label>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <button key={k} onClick={() => setPriority(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${priority === k ? v.color : "#1E293B"}`, background: priority === k ? v.color + "22" : "transparent", color: priority === k ? v.color : "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>⏳ Timeframe to Resolve</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SLA_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setSla(s.value)} style={{ padding: "6px 12px", borderRadius: 99, border: `1.5px solid ${sla === s.value ? "#3B9EFF" : "#1E293B"}`, background: sla === s.value ? "#3B9EFF22" : "transparent", color: sla === s.value ? "#3B9EFF" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>🔔 Remind Me Before Deadline</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {[["", "None"], ["30", "30 min"], ["60", "1 hr"], ["120", "2 hrs"], ["480", "8 hrs"]].map(([v, l]) => (
              <button key={l} onClick={() => setRemOffset(v)} style={{ padding: "6px 12px", borderRadius: 99, border: `1.5px solid ${remOffset === v ? "#FF6B35" : "#1E293B"}`, background: remOffset === v ? "#FF6B3522" : "transparent", color: remOffset === v ? "#FF6B35" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={lbl}>Assign To</label>
          <select value={assignTo} onChange={e => setAssignTo(e.target.value)} style={inp}>
            {[me, ...users.filter(u => u.id !== me.id)].map(u => (
              <option key={u.id} value={u.id}>{u.id === me.id ? `Me (${u.name.split(" ")[0]})` : u.name}</option>
            ))}
          </select>
        </div>

        <button onClick={submit} disabled={!canSubmit} style={{ width: "100%", padding: 14, background: canSubmit ? "linear-gradient(135deg,#FF6B35,#FF4D8F)" : "#1E293B", border: "none", borderRadius: 12, color: canSubmit ? "#fff" : "#334155", fontWeight: 800, fontSize: 15, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Lodge Request →
        </button>
      </div>
    </div>
  );
}

function Detail({ req, users, me, onClose, onUpdate, onDelete, notify }) {
  const [note, setNote] = useState(req.note || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const owner = users.find(u => u.id === req.assignedTo);
  const sla = getSLAStatus(req);
  const timeLeft = getTimeLeft(req);

  const cycleStatus = () => {
    const flow = { open: "in-progress", "in-progress": "done", done: "open" };
    const next = flow[req.status];
    onUpdate({ ...req, status: next });
    if (next === "done") notify("✅ Resolved", `${req.clientName}'s request marked done`);
  };

  const pickUp = () => {
    onUpdate({ ...req, assignedTo: me.id });
    notify("👋 Picked up", `${req.clientName}'s request is now yours`);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(req.id);
    notify("🗑 Deleted", `${req.clientName}'s request has been removed`);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0D1B2A", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 520, padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#1E293B", borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
          <Chip label={PRIORITIES[req.priority].label} color={PRIORITIES[req.priority].color} />
          <Chip label={STATUSES[req.status].label} color={STATUSES[req.status].color} />
          {sla?.status === "breached" && <Chip label="SLA Breached" color="#FF4444" />}
          {sla?.status === "warning"  && <Chip label="Due Soon"    color="#FFB347" />}
        </div>

        <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>CLIENT</div>
        <h2 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{req.clientName}</h2>
        <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>{req.request}</p>

        {sla && (
          <div style={{ background: sla.status === "breached" ? "#FF444411" : sla.status === "warning" ? "#FFB34711" : "#0F172A", border: `1px solid ${sla.color}33`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: sla.color, fontWeight: 700 }}>⏳ {sla.label}</span>
              <span style={{ fontSize: 13, color: sla.color, fontWeight: 800 }}>{timeLeft}</span>
            </div>
            <div style={{ height: 6, background: "#0F172A", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${sla.pct}%`, background: sla.color, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 5 }}>Timeframe: {getSLALabel(req.slaMinutes)}</div>
          </div>
        )}

        {req.audioUrl && (
          <div style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, marginBottom: 8 }}>🎙 VOICE NOTE</div>
            <audio src={req.audioUrl} controls style={{ width: "100%" }} />
            {req.transcript && <p style={{ color: "#475569", fontSize: 12, margin: "8px 0 0", fontStyle: "italic" }}>{req.transcript}</p>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ background: "#0F172A", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>Assigned To</div>
            {owner
              ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Av user={owner} size={24} /><span style={{ color: "#CBD5E1", fontSize: 13 }}>{owner.id === me.id ? "You" : owner.name.split(" ")[0]}</span></div>
              : <button onClick={pickUp} style={{ background: "#3B9EFF22", border: "1px solid #3B9EFF44", borderRadius: 8, color: "#3B9EFF", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "4px 10px" }}>Pick up →</button>
            }
          </div>
          <div style={{ background: "#0F172A", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>Logged</div>
            <div style={{ color: "#CBD5E1", fontSize: 13 }}>{timeAgo(req.createdAt)}</div>
          </div>
        </div>

        {req.assignedTo !== me.id && req.status !== "done" && owner && (
          <button onClick={pickUp} style={{ width: "100%", padding: 11, background: "#3B9EFF15", border: "1px solid #3B9EFF44", borderRadius: 10, color: "#3B9EFF", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
            👋 Take over this request
          </button>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Notes</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={() => onUpdate({ ...req, note })} placeholder="Add follow-up notes…" rows={3} style={{ width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, padding: "11px 14px", color: "#F1F5F9", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, background: "#0F172A", border: "1px solid #1E293B", borderRadius: 12, color: "#64748B", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Close</button>
          <button onClick={cycleStatus} style={{ flex: 2, padding: 13, background: `linear-gradient(135deg,${STATUSES[req.status].color},${STATUSES[req.status].color}99)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
            Mark as {STATUSES[{open:"in-progress","in-progress":"done",done:"open"}[req.status]].label} →
          </button>
        </div>
        <button onClick={handleDelete} style={{ width: "100%", padding: 13, background: confirmDelete ? "#FF444422" : "transparent", border: `1px solid ${confirmDelete ? "#FF4444" : "#1E293B"}`, borderRadius: 12, color: confirmDelete ? "#FF4444" : "#475569", fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
          {confirmDelete ? "⚠️ Tap again to confirm delete" : "🗑 Delete Request"}
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function Lodgit() {
  const me = SEED_ME;
  const [team] = useState(SEED_TEAM);
  const allUsers = [me, ...team];
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("mine");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { inApp, notify, dismiss, clearAll, granted, requestPerm } = useNotifications();

  // Load requests from Supabase
  useEffect(() => {
    const fetchReqs = async () => {
      const { data, error } = await supabase.from("requests").select("*").order("createdAt", { ascending: false });
      if (!error && data) setReqs(data);
      setLoading(false);
    };
    fetchReqs();

    // Real-time updates
    const channel = supabase.channel("requests").on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => fetchReqs()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useSLAWatcher(reqs, notify);

  const add = async (form) => {
    const newReq = { ...form, createdAt: new Date().toISOString() };
    const { data, error } = await supabase.from("requests").insert([newReq]).select();
    if (!error && data) setReqs(p => [data[0], ...p]);
  };

  const update = async (u) => {
    const { error } = await supabase.from("requests").update(u).eq("id", u.id);
    if (!error) { setReqs(p => p.map(r => r.id === u.id ? u : r)); setSelected(u); }
  };

  const cycle = async (id) => {
    const flow = { open:"in-progress","in-progress":"done",done:"open" };
    const req = reqs.find(r => r.id === id);
    if (!req) return;
    const newStatus = flow[req.status];
    await supabase.from("requests").update({ status: newStatus }).eq("id", id);
    setReqs(p => p.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const pickUp = async (id) => {
    await supabase.from("requests").update({ assignedTo: me.id }).eq("id", id);
    setReqs(p => p.map(r => r.id === id ? { ...r, assignedTo: me.id } : r));
    notify("👋 Request picked up", "Added to your queue");
  };

  const deleteReq = async (id) => {
    await supabase.from("requests").delete().eq("id", id);
    setReqs(p => p.filter(r => r.id !== id));
    setSelected(null);
  };

  const shown = reqs.filter(r => {
    if (tab === "mine" && r.assignedTo !== me.id) return false;
    if (filter !== "all" && r.status !== filter) return false;
    return true;
  });

  const myOpen    = reqs.filter(r => r.assignedTo === me.id && r.status !== "done").length;
  const breached  = reqs.filter(r => r.status !== "done" && getSLAStatus(r)?.status === "breached").length;
  const unassigned = reqs.filter(r => !r.assignedTo && r.status !== "done").length;

  const navItems = [
    { id: "mine",  icon: "👤", label: "Mine"  },
    { id: "team",  icon: "👥", label: "Team"  },
    { id: "stats", icon: "📊", label: "Stats" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080F1A", fontFamily: "'Sora','Segoe UI',sans-serif", maxWidth: 520, margin: "0 auto", position: "relative" }}>
      <style>{`@keyframes slideIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "#080F1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#FF6B35", letterSpacing: "-2px", marginBottom: 12 }}>Lodgit</div>
          <div style={{ color: "#334155", fontSize: 13 }}>Loading requests...</div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", top: 14, right: 14, left: 14, zIndex: 300, maxWidth: 400, margin: "0 auto" }}>
        {inApp.slice(0,3).map(n => <Toast key={n.id} notif={n} onDismiss={dismiss} />)}
      </div>

      {/* Header */}
      <div style={{ background: "#0D1B2A", padding: "20px 16px 0", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #0F2040" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: "#FF6B35", letterSpacing: "-1px" }}>Lodg</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: "#F1F5F9", letterSpacing: "-1px" }}>it</span>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF6B35", marginLeft: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: 0.8 }}>Never drop a request again</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowNotifs(true)} style={{ position: "relative", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15 }}>
              🔔
              {inApp.length > 0 && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: "#FF4444", borderRadius: "50%", border: "2px solid #0D1B2A" }} />}
            </button>
            <button onClick={() => setShowLog(true)} style={{ background: "linear-gradient(135deg,#FF6B35,#FF4D8F)", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>+ Lodge</button>
            <Av user={me} size={34} />
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[{l:"My Open",v:myOpen,c:"#FF6B35"},{l:"Breached",v:breached,c:"#FF4444"},{l:"Unassigned",v:unassigned,c:"#3B9EFF"}].map(s => (
            <div key={s.l} style={{ flex: 1, background: "#0F172A", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.c, letterSpacing: "-1px" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#334155", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {!granted && (
          <button onClick={requestPerm} style={{ width: "100%", background: "#FF6B3511", border: "1px solid #FF6B3533", borderRadius: 10, color: "#FF6B35", fontSize: 12, fontWeight: 700, padding: "8px", cursor: "pointer", marginBottom: 10 }}>
            🔔 Enable push notifications for reminders
          </button>
        )}

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {[["all","All"],["open","Open"],["in-progress","In Progress"],["done","Done"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: "5px 13px", borderRadius: 99, border: "none", background: filter === v ? "#FF6B35" : "#0F172A", color: filter === v ? "#fff" : "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 10, borderTop: "1px solid #0F2040" }}>
          {navItems.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #FF6B35" : "2px solid transparent", color: tab === t.id ? "#FF6B35" : "#334155", fontSize: 11, fontWeight: 800, padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 14px 100px" }}>
        {(tab === "mine" || tab === "team") && (
          <>
            {breached > 0 && (
              <div style={{ background: "#FF444411", border: "1px solid #FF444433", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <span>🚨</span><span style={{ color: "#FF4444", fontSize: 13, fontWeight: 700 }}>{breached} request{breached > 1 ? "s have" : " has"} breached SLA</span>
              </div>
            )}
            {unassigned > 0 && tab === "team" && (
              <div style={{ background: "#3B9EFF11", border: "1px solid #3B9EFF33", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <span>📭</span><span style={{ color: "#3B9EFF", fontSize: 13, fontWeight: 700 }}>{unassigned} unassigned — anyone can pick up</span>
              </div>
            )}
            {shown.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 0" }}><div style={{ fontSize: 40 }}>📭</div><p style={{ color: "#1E293B", fontSize: 14 }}>Nothing here</p></div>
              : shown.map(r => <Card key={r.id} req={r} users={allUsers} me={me} onTap={setSelected} onCycle={cycle} onPickUp={pickUp} />)
            }
          </>
        )}

        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[{l:"Total",v:reqs.length,c:"#3B9EFF"},{l:"Open",v:reqs.filter(r=>r.status==="open").length,c:"#FF6B35"},{l:"In Progress",v:reqs.filter(r=>r.status==="in-progress").length,c:"#A855F7"},{l:"Done",v:reqs.filter(r=>r.status==="done").length,c:"#00C896"}].map(s => (
                <div key={s.l} style={{ background: "#16213E", borderRadius: 14, padding: 18, borderBottom: `3px solid ${s.c}` }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.c, letterSpacing: "-1px" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontWeight: 700 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#16213E", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>Team Performance</div>
              {allUsers.map(u => {
                const ur = reqs.filter(r => r.assignedTo === u.id);
                const done = ur.filter(r => r.status === "done").length;
                const br = ur.filter(r => r.status !== "done" && getSLAStatus(r)?.status === "breached").length;
                const pct = ur.length ? Math.round(done / ur.length * 100) : 0;
                return (
                  <div key={u.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                    <Av user={u} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>{u.id === me.id ? "You" : u.name.split(" ")[0]}</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {br > 0 && <span style={{ fontSize: 10, color: "#FF4444", fontWeight: 700 }}>⚠ {br}</span>}
                          <span style={{ color: "#00C896", fontSize: 12, fontWeight: 700 }}>{done}/{ur.length}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: "#0F172A", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#FF6B35,#00C896)", borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, background: "#0D1B2A", borderTop: "1px solid #0F2040", display: "flex", justifyContent: "space-around", padding: "10px 0 22px", zIndex: 20 }}>
        {navItems.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 24px" }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? "#FF6B35" : "#334155", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FF6B35" }} />}
          </button>
        ))}
      </div>

      {showNotifs && <NotifPanel notifs={inApp} onDismiss={dismiss} onClear={clearAll} onClose={() => setShowNotifs(false)} />}
      {showLog && <LogModal users={allUsers} me={me} onClose={() => setShowLog(false)} onSave={add} notify={notify} />}
      {selected && <Detail req={selected} users={allUsers} me={me} onClose={() => setSelected(null)} onUpdate={update} onDelete={deleteReq} notify={notify} />}
    </div>
  );
}
