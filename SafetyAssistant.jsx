import { useState, useRef, useEffect } from "react";
import {
  Shield, AlertTriangle, Phone, MapPin, Wifi, WifiOff, Radio,
  MessageSquare, BookOpen, Settings, Mic, MicOff, Send, Heart,
  Zap, Users, Battery, Signal, ChevronRight, Navigation, Bell,
  Lock, Check, X, Activity, Bluetooth, Cpu, Database,
} from "lucide-react";

// ─── Offline Knowledge Base ──────────────────────────────────────────────────
const OFFLINE_KB = {
  cpr: `CPR PROTOCOL (Offline Mode)\n\n1. CHECK scene safety. Tap shoulders: "Are you OK?"\n2. CALL 112 immediately or assign bystander\n3. LAY person on flat, firm surface\n4. HANDS: Heel of dominant hand on center of chest, interlock fingers\n5. COMPRESSIONS: Push 5–6 cm deep at 100–120 BPM (Stayin' Alive beat)\n6. 30 compressions → tilt head, lift chin → 2 rescue breaths (1 sec each)\n7. REPEAT cycle. Don't stop until AED arrives or help takes over\n\nAED Steps: Power ON → attach pads → follow voice prompts → shock if advised`,
  bleeding: `BLEEDING CONTROL (Offline Mode)\n\n1. PROTECT yourself — use gloves or plastic bag on hands\n2. APPLY direct firm pressure with cleanest material available\n3. DO NOT remove cloth — layer more on top if soaked through\n4. ELEVATE limb above heart level if no fracture suspected\n5. TOURNIQUET (severe limb only): 2–3 inches above wound, tighten until bleeding stops\n6. MARK tourniquet time on skin with marker or pen\n7. SHOCK signs: pale/cold skin, rapid weak pulse, confusion — lay flat, keep warm`,
  fire: `FIRE EMERGENCY (Offline Mode)\n\nRACE Protocol:\n1. RESCUE people in immediate danger if safe to do so\n2. ALERT everyone — shout "FIRE" repeatedly, activate alarm\n3. CONTAIN — close all doors (do not lock) to slow spread\n4. EXTINGUISH small fires with PASS: Pull pin, Aim low, Squeeze, Sweep\n   OR EVACUATE if fire is beyond control\n\nEvacuation:\n• Feel doors before opening — HOT = find another exit\n• Stay low if smoky — air is cleaner near floor\n• Never use elevators\n• Meet at designated assembly point\n• Call fire dept from OUTSIDE. NEVER re-enter`,
  earthquake: `EARTHQUAKE (Offline Mode)\n\nDURING shaking — DROP, COVER, HOLD ON:\n1. DROP to hands and knees\n2. Take COVER under sturdy desk/table or against interior wall\n3. HOLD ON and protect head/neck with arms\n4. Stay away from windows, exterior walls, heavy furniture\n5. If outdoors: move away from buildings, power lines\n6. If driving: pull over away from bridges/overpasses\n\nAFTER shaking stops:\n• Expect aftershocks\n• Check for gas leaks (smell) — evacuate and call from outside\n• Check for injuries — apply first aid\n• Do not use open flames or switches if gas suspected`,
  threat: `ACTIVE THREAT — RUN, HIDE, FIGHT (Offline Mode)\n\nRUN (first choice):\n1. Leave immediately — leave belongings behind\n2. Help others escape if possible, but don't wait\n3. Prevent others from entering the area\n4. Call 112 when safe\n\nHIDE (if can't run):\n1. Find room with lockable door — lock and barricade it\n2. Turn off lights, silence phone completely\n3. Stay away from doors, spread out\n4. Do NOT open door unless confirmed by police\n\nFIGHT (absolute last resort):\n1. Act aggressively — commit fully\n2. Improvise weapons: fire extinguisher, chairs, laptops\n3. Aim for eyes, throat, groin\n4. Keep fighting until threat is neutralized`,
  default: `EMERGENCY RESOURCES (Offline Mode)\n\n🆘 India Emergency Numbers:\n• Police: 100\n• Fire: 101\n• Ambulance: 102\n• Unified Emergency: 112\n• Disaster Management: 108\n\n📋 General Emergency Steps:\n1. Stay calm — panic impairs decision-making\n2. Assess situation before acting\n3. Call emergency services if safe to do so\n4. Provide location, nature of emergency, number of people\n5. Follow dispatcher instructions\n6. Stay on line until help arrives\n\nUse the Guidance tab for detailed protocols on CPR, bleeding, fire, and threats.`,
};

const getOfflineResponse = (q) => {
  const lq = q.toLowerCase();
  if (lq.match(/cpr|cardiac|heart attack|resuscitat|chest compress/)) return OFFLINE_KB.cpr;
  if (lq.match(/bleed|wound|cut|blood|tourniquet|hemor/)) return OFFLINE_KB.bleeding;
  if (lq.match(/fire|burn|smoke|flame|evacuat/)) return OFFLINE_KB.fire;
  if (lq.match(/earthquake|quake|tremor|seismic/)) return OFFLINE_KB.earthquake;
  if (lq.match(/threat|attacker|gun|weapon|shooter|danger|attack/)) return OFFLINE_KB.threat;
  return OFFLINE_KB.default;
};

// ─── Emergency Guidance Data ─────────────────────────────────────────────────
const GUIDES = [
  {
    id: "cpr", title: "CPR Protocol", icon: Heart, color: "#ef4444",
    subtitle: "Cardiac Emergency", steps: [
      "Check scene safety. Tap shoulder: 'Are you OK?'",
      "Call 112 immediately or assign someone nearby",
      "Lay person flat on firm, hard surface",
      "Place heel of hand on center of chest, interlock fingers",
      "Push 5–6 cm deep at 100–120 BPM — 30 compressions",
      "Tilt head back, lift chin, give 2 rescue breaths (1 sec each)",
      "Continue 30:2 cycle until AED arrives or help takes over",
    ],
  },
  {
    id: "bleeding", title: "Bleeding Control", icon: Zap, color: "#f97316",
    subtitle: "Trauma Response", steps: [
      "Protect yourself — use gloves or clean barrier",
      "Apply firm direct pressure with cleanest material available",
      "Do NOT remove soaked cloth — layer more on top",
      "Elevate injured limb above heart level if no fracture",
      "For severe limb: tourniquet 2–3 inches above wound",
      "Note tourniquet time — write on skin with marker",
      "Watch for shock: pale, cold, rapid pulse, confusion",
    ],
  },
  {
    id: "fire", title: "Fire Emergency", icon: AlertTriangle, color: "#eab308",
    subtitle: "RACE Protocol", steps: [
      "RESCUE: Remove people in immediate danger if safe",
      "ALERT: Shout 'FIRE!' repeatedly, activate nearest alarm",
      "CONTAIN: Close doors to slow fire spread (don't lock)",
      "Feel door before opening — hot door means find another exit",
      "Stay low if smoke present — cleaner air near floor",
      "EVACUATE: Use stairs only, never elevators",
      "Assemble at meeting point. Call fire dept from outside",
    ],
  },
  {
    id: "threat", title: "Active Threat", icon: Shield, color: "#8b5cf6",
    subtitle: "Run-Hide-Fight", steps: [
      "RUN: Evacuate immediately if possible, leave belongings",
      "Help others escape. Prevent people from entering area",
      "Call 112 when you reach safety",
      "HIDE: Find room with lockable door, barricade it",
      "Silence phone completely. Turn off lights. Stay low",
      "FIGHT (last resort): Act aggressively with improvised weapons",
      "When police arrive: hands visible, follow all commands",
    ],
  },
];

const MESH_PEERS_INIT = [
  { name: "Alex", dist: "12m", status: "online" },
  { name: "Priya", dist: "34m", status: "online" },
  { name: "James", dist: "67m", status: "online" },
  { name: "Fatima", dist: "89m", status: "weak" },
];

const INITIAL_MESH_MSGS = [
  { from: "Priya (34m)", text: "All clear on Sector B, no threats visible", time: "14:32", mine: false },
  { from: "James (67m)", text: "Road blocked at North gate — use east exit", time: "14:38", mine: false },
  { from: "Me", text: "Monitoring main entrance, will report any changes", time: "14:41", mine: true },
];

const INITIAL_CHAT = [
  {
    role: "assistant",
    content: "🛡️ Guardian AI online. I'm your emergency safety assistant powered by advanced AI.\n\nI can help you with:\n• Emergency first aid (CPR, bleeding, burns)\n• Disaster response protocols\n• Real-time SOS message generation\n• Location-based safety advice\n• Personal security guidance\n\nWhat situation do you need help with?",
  },
];

const AREA_ALERTS = [
  { type: "warn", msg: "Heavy rainfall advisory — flash flood risk in low areas", time: "15 min ago" },
  { type: "info", msg: "Road closure on NH-1 near Phagwara — use bypass", time: "1 hr ago" },
  { type: "info", msg: "Power outage reported in Sector 7 — backup recommended", time: "2 hr ago" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SafetyAssistant() {
  const [tab, setTab] = useState("dashboard");
  const [online, setOnline] = useState(true);
  const [sosHeld, setSosHeld] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [messages, setMessages] = useState(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [meshMsgs, setMeshMsgs] = useState(INITIAL_MESH_MSGS);
  const [meshInput, setMeshInput] = useState("");
  const [activeGuide, setActiveGuide] = useState(null);
  const [battery] = useState(87);
  const [notifCount, setNotifCount] = useState(2);

  const chatEndRef = useRef(null);
  const sosIntervalRef = useRef(null);
  const sosTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  const location = { lat: 31.326, lng: 75.576, city: "Jalandhar, PB" };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SOS hold logic
  const handleSosDown = () => {
    setSosHeld(true);
    setSosCountdown(3);
    let count = 3;
    sosIntervalRef.current = setInterval(() => {
      count -= 1;
      setSosCountdown(count);
      if (count <= 0) {
        clearInterval(sosIntervalRef.current);
        triggerSOS();
      }
    }, 1000);
  };

  const handleSosUp = () => {
    if (sosCountdown > 0) {
      setSosHeld(false);
      setSosCountdown(3);
      clearInterval(sosIntervalRef.current);
    }
  };

  const triggerSOS = () => {
    setSosHeld(false);
    setSosCountdown(3);
    const t = new Date();
    const time = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
    setMeshMsgs((prev) => [
      ...prev,
      {
        from: "Me",
        text: `🚨 SOS ACTIVATED — Emergency at ${location.city} (${location.lat}, ${location.lng}) — Requesting immediate assistance — ${time}`,
        time,
        mine: true,
        sos: true,
      },
    ]);
    setTab("mesh");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🚨 SOS ACTIVATED\n\nEmergency broadcast sent to:\n✓ 3 nearby mesh devices\n✓ Emergency services (112)\n✓ Primary emergency contact\n\nYour location: ${location.city}\nCoordinates: ${location.lat}, ${location.lng}\nTime: ${time}\n\nStay calm. Help is being coordinated. I'm here to guide you.`,
        },
      ]);
    }, 500);
  };

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg) return;
    const newHistory = [...messages, { role: "user", content: userMsg }];
    setMessages(newHistory);
    setInput("");
    setAiLoading(true);

    if (!online) {
      await new Promise((r) => setTimeout(r, 600));
      setMessages([
        ...newHistory,
        { role: "assistant", content: `[📡 OFFLINE AI]\n\n${getOfflineResponse(userMsg)}` },
      ]);
      setAiLoading(false);
      return;
    }

    try {
      const apiHistory = newHistory.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are Guardian AI, an elite emergency safety assistant embedded in a mobile safety app. You provide life-saving guidance for real emergencies.

Your capabilities:
- Emergency first aid: CPR, bleeding control, choking, burns, fractures
- Disaster response: fire, earthquake, flood, active threats, chemical spills
- Personal safety and situational awareness
- SOS message generation (clear, GPS-tagged, formatted for emergency services)
- Location-based safety advice

User context: Located in ${location.city} (${location.lat}, ${location.lng}). Current mode: Online. 

Rules:
- Be direct, concise, and actionable — lives may depend on response time
- Use numbered steps for procedures
- Lead with the most critical action first
- For serious emergencies, always mention calling 112 (India)
- Use ALL CAPS for critical warnings
- Never hedge excessively — give clear guidance`,
          messages: apiHistory,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map((b) => b.text || "").join("") || "Unable to get response. Switch to offline mode.";
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "⚠️ Connection lost. Switching to offline AI mode is recommended. Use the mode toggle in the header.",
        },
      ]);
    }
    setAiLoading(false);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      sendMessage("How do I call emergency services?");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => sendMessage(e.results[0][0].transcript);
    rec.start();
    recognitionRef.current = rec;
  };

  const sendMesh = () => {
    if (!meshInput.trim()) return;
    const t = new Date();
    setMeshMsgs((prev) => [
      ...prev,
      {
        from: "Me",
        text: meshInput,
        time: `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`,
        mine: true,
      },
    ]);
    setMeshInput("");
  };

  // ─── Color tokens ───────────────────────────────────────────────────────────
  const C = {
    bg: "#080a0c",
    surface: "#0d1117",
    card: "#161b22",
    border: "#21262d",
    borderHov: "#30363d",
    red: "#ef4444",
    orange: "#f97316",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    yellow: "#eab308",
    text: "#e6edf3",
    muted: "#8b949e",
    faint: "#484f58",
  };

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
  };

  const TABS = [
    { id: "dashboard", label: "Home", Icon: Shield },
    { id: "assistant", label: "AI Chat", Icon: MessageSquare },
    { id: "guidance", label: "Guides", Icon: BookOpen },
    { id: "mesh", label: "Mesh", Icon: Radio },
    { id: "settings", label: "Config", Icon: Settings },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, display: "flex", flexDirection: "column", fontFamily: "'Rajdhani', 'Segoe UI', sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
        textarea, input { outline: none !important; }
        .blink { animation: blink 1.2s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .sos-ring { animation: ring 1s ease-out infinite; }
        @keyframes ring { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 100% { box-shadow: 0 0 0 24px rgba(239,68,68,0); } }
        .slide { animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .tab-btn:hover { color: #e6edf3 !important; }
        .action-btn:hover { border-color: var(--hover-color) !important; }
        .guide-btn:hover { border-color: var(--guide-color) !important; background: var(--guide-bg) !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1a0000", border: `1px solid ${C.red}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={16} color={C.red} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 3, color: "#f0f6fc", fontFamily: "Rajdhani" }}>GUARDIAN AI</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2 }}>SAFETY ASSISTANT</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#0d1f18", border: `1px solid ${C.green}30`, borderRadius: 4 }}>
            <MapPin size={10} color={C.green} />
            <span style={{ fontSize: 10, color: C.green, letterSpacing: 0.5, fontFamily: "JetBrains Mono" }}>Jalandhar</span>
          </div>
          <button
            onClick={() => setOnline((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: online ? "#0d1f18" : "#1c1010", border: `1px solid ${online ? C.green : C.faint}`, borderRadius: 20, cursor: "pointer", color: online ? C.green : C.faint, fontSize: 10, fontFamily: "Rajdhani", fontWeight: 700, letterSpacing: 1 }}
          >
            {online ? <Wifi size={11} /> : <WifiOff size={11} />}
            {online ? "ONLINE" : "OFFLINE"}
          </button>
        </div>
      </div>

      {/* Offline banner */}
      {!online && (
        <div style={{ background: "#1a0f00", borderBottom: `1px solid ${C.orange}50`, padding: "5px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={11} color={C.orange} className="blink" />
          <span style={{ fontSize: 11, color: C.orange, letterSpacing: 1, fontFamily: "JetBrains Mono" }}>OFFLINE — Local LLaMA + BLE Mesh Active</span>
        </div>
      )}

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>

        {/* ═══════════ DASHBOARD ═══════════ */}
        {tab === "dashboard" && (
          <div className="slide">
            {/* Status bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
              {[
                { Icon: Signal, label: "Signal", val: online ? "4G" : "MESH", color: online ? C.green : C.orange },
                { Icon: Battery, label: "Battery", val: `${battery}%`, color: battery > 30 ? C.green : C.red },
                { Icon: MapPin, label: "GPS", val: "Active", color: C.green },
                { Icon: Users, label: "Peers", val: "4", color: C.blue },
              ].map(({ Icon, label, val, color }) => (
                <div key={label} style={{ ...cardStyle, padding: "10px 8px", textAlign: "center" }}>
                  <Icon size={14} color={color} style={{ margin: "0 auto 3px", display: "block" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "JetBrains Mono" }}>{val}</div>
                  <div style={{ fontSize: 9, color: C.faint, letterSpacing: 1, marginTop: 1 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* SOS Button */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 16px" }}>
              <div style={{ position: "relative" }}>
                {sosHeld && (
                  <div style={{
                    position: "absolute", inset: -8, borderRadius: "50%",
                    border: `2px solid ${C.red}`, opacity: 0.6,
                    animation: "ring 1s ease-out infinite",
                  }} />
                )}
                <button
                  onMouseDown={handleSosDown}
                  onMouseUp={handleSosUp}
                  onTouchStart={handleSosDown}
                  onTouchEnd={handleSosUp}
                  className={sosHeld ? "sos-ring" : ""}
                  style={{
                    width: 130, height: 130, borderRadius: "50%",
                    background: sosHeld ? "#3d0000" : "#1a0000",
                    border: `2px solid ${sosHeld ? C.red : "#dc2626"}`,
                    color: sosHeld ? "#fca5a5" : C.red,
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    transition: "all 0.15s",
                    userSelect: "none",
                  }}
                >
                  <AlertTriangle size={26} />
                  <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 22, letterSpacing: 4 }}>SOS</span>
                  {sosHeld && (
                    <span style={{ fontSize: 12, color: "#fca5a5", fontFamily: "JetBrains Mono" }}>{sosCountdown}s</span>
                  )}
                </button>
              </div>
              <p style={{ fontSize: 10, color: C.faint, marginTop: 10, letterSpacing: 1, fontFamily: "JetBrains Mono" }}>
                {sosHeld ? "⚠ RELEASE TO CANCEL" : "HOLD 3 SECONDS TO ACTIVATE"}
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>QUICK ACTIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { Icon: Heart, label: "CPR Guide", color: C.red, action: () => { setActiveGuide("cpr"); setTab("guidance"); } },
                  { Icon: Phone, label: "Call 112", color: C.green, action: () => alert("📞 Calling 112 — Emergency Services\n\nIn a real app, this would initiate the call immediately.") },
                  { Icon: Navigation, label: "Share Location", color: C.blue, action: () => alert(`📍 Location Shared\n\n${location.city}\nLat: ${location.lat}, Lng: ${location.lng}\n\nSent to emergency contacts and mesh peers.`) },
                  { Icon: MessageSquare, label: "AI Assistant", color: C.purple, action: () => setTab("assistant") },
                ].map(({ Icon, label, color, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.text, border: `1px solid ${C.border}`, fontFamily: "Rajdhani", fontSize: 13, fontWeight: 500, transition: "border-color 0.2s", "--hover-color": color }}
                    className="action-btn"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} color={color} />
                    </div>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Alerts */}
            <div>
              <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                AREA ALERTS
                {notifCount > 0 && <span style={{ background: C.red, color: "white", borderRadius: 10, fontSize: 9, padding: "1px 5px", fontFamily: "JetBrains Mono" }}>{notifCount}</span>}
              </div>
              {AREA_ALERTS.map((a, i) => (
                <div key={i} onClick={() => setNotifCount(0)} style={{ ...cardStyle, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 10, borderLeft: `3px solid ${a.type === "warn" ? C.orange : C.blue}`, cursor: "pointer" }}>
                  <Bell size={13} color={a.type === "warn" ? C.orange : C.blue} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13 }}>{a.msg}</div>
                    <div style={{ fontSize: 10, color: C.faint, marginTop: 3, fontFamily: "JetBrains Mono" }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ AI ASSISTANT ═══════════ */}
        {tab === "assistant" && (
          <div className="slide" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 200px)" }}>
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={11} />
              {online ? "GUARDIAN AI — Claude Sonnet (Online)" : "GUARDIAN AI — LLaMA 3.1 8B (Offline)"}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, minHeight: 300 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a0000", border: `1px solid ${C.red}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                      <Shield size={12} color={C.red} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: "78%", padding: "9px 13px",
                    borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
                    background: m.role === "user" ? "#1c2d45" : C.card,
                    border: `1px solid ${m.role === "user" ? "#1d4ed820" : C.border}`,
                    fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", fontFamily: "Rajdhani",
                    color: m.role === "user" ? "#bfdbfe" : C.text,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a0000", border: `1px solid ${C.red}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Shield size={12} color={C.red} />
                  </div>
                  <div style={{ ...cardStyle, padding: "9px 13px", fontSize: 13, color: C.muted }}>
                    <Activity size={13} style={{ display: "inline", marginRight: 6 }} className="blink" />
                    Analyzing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {["CPR steps", "Generate SOS", "Fire evacuation", "I'm being followed", "Choking response"].map((p) => (
                <button key={p} onClick={() => sendMessage(p)} style={{ padding: "4px 10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "Rajdhani", whiteSpace: "nowrap", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button onClick={startVoice} style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${listening ? C.red : C.border}`, background: listening ? "#1a0000" : C.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {listening ? <MicOff size={15} color={C.red} className="blink" /> : <Mic size={15} color={C.muted} />}
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Describe your emergency or ask a safety question..."
                rows={2}
                style={{ flex: 1, padding: "9px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "Rajdhani", resize: "none", lineHeight: 1.5 }}
              />
              <button onClick={() => sendMessage()} disabled={aiLoading} style={{ width: 40, height: 40, borderRadius: 8, background: aiLoading ? C.faint : C.red, border: "none", cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Send size={15} color="white" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ GUIDANCE ═══════════ */}
        {tab === "guidance" && (
          <div className="slide">
            {activeGuide ? (() => {
              const guide = GUIDES.find((g) => g.id === activeGuide);
              const GIcon = guide.icon;
              return (
                <div>
                  <button onClick={() => setActiveGuide(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, cursor: "pointer", marginBottom: 14, fontSize: 13, fontFamily: "Rajdhani" }}>
                    ← All Guides
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: `${guide.color}18`, border: `1px solid ${guide.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <GIcon size={22} color={guide.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>{guide.title}</div>
                      <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2 }}>{guide.subtitle.toUpperCase()}</div>
                    </div>
                  </div>
                  {guide.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, ...cardStyle, padding: "11px 14px" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${guide.color}18`, border: `1px solid ${guide.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: guide.color, flexShrink: 0, fontFamily: "JetBrains Mono" }}>{i + 1}</div>
                      <span style={{ fontSize: 13, lineHeight: 1.6, paddingTop: 3 }}>{step}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => { setTab("assistant"); sendMessage(`Give me detailed emergency guidance on: ${guide.title}`); }}
                    style={{ marginTop: 8, width: "100%", padding: "11px", background: `${guide.color}10`, border: `1px solid ${guide.color}50`, borderRadius: 8, color: guide.color, cursor: "pointer", fontFamily: "Rajdhani", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <MessageSquare size={14} /> ASK AI FOR DETAILED HELP
                  </button>
                </div>
              );
            })() : (
              <div>
                <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>EMERGENCY PROTOCOLS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {GUIDES.map((guide) => {
                    const GIcon = guide.icon;
                    return (
                      <button key={guide.id} onClick={() => setActiveGuide(guide.id)} style={{ ...cardStyle, padding: "14px 12px", cursor: "pointer", textAlign: "left", color: C.text, fontFamily: "Rajdhani", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s", "--guide-color": guide.color, "--guide-bg": `${guide.color}08` }}
                        className="guide-btn"
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = guide.color; e.currentTarget.style.background = `${guide.color}08`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: `${guide.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <GIcon size={18} color={guide.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{guide.title}</div>
                          <div style={{ fontSize: 10, color: C.faint }}>{guide.subtitle}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: C.faint, fontFamily: "JetBrains Mono" }}>{guide.steps.length} steps</span>
                          <ChevronRight size={13} color={C.faint} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ ...cardStyle, padding: "12px 14px", borderLeft: `3px solid ${C.blue}`, display: "flex", gap: 10, alignItems: "center" }}>
                  <Lock size={14} color={C.blue} />
                  <span style={{ fontSize: 12, color: C.muted }}>All protocols cached offline — available without internet</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ MESH NETWORK ═══════════ */}
        {tab === "mesh" && (
          <div className="slide">
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Bluetooth size={11} /> MESH NETWORK — BLE + WiFi DIRECT
            </div>

            {/* Peers */}
            <div style={{ ...cardStyle, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.faint, letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>CONNECTED PEERS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MESH_PEERS_INIT.map((peer) => (
                  <div key={peer.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: peer.status === "online" ? "#0d1f18" : "#1a1a1a", border: `1px solid ${peer.status === "online" ? C.green + "40" : C.faint + "30"}`, borderRadius: 20 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: peer.status === "online" ? C.green : C.faint }} className={peer.status === "online" ? "blink" : ""} />
                    <span style={{ fontSize: 11, color: peer.status === "online" ? "#86efac" : C.faint, fontFamily: "JetBrains Mono" }}>{peer.name} · {peer.dist}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
              {[["~100m", "BLE Range"], ["4 hops", "Max Relay"], ["AES-256", "Encryption"]].map(([v, l]) => (
                <div key={l} style={{ ...cardStyle, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, fontFamily: "JetBrains Mono" }}>{v}</div>
                  <div style={{ fontSize: 9, color: C.faint, letterSpacing: 1, marginTop: 2 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Messages */}
            <div style={{ ...cardStyle, padding: "12px", marginBottom: 10, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {meshMsgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "8px 11px",
                    borderRadius: m.mine ? "10px 10px 3px 10px" : "3px 10px 10px 10px",
                    background: m.sos ? "#1a0000" : m.mine ? "#1c2d45" : "#1a1f2e",
                    border: `1px solid ${m.sos ? C.red + "60" : m.mine ? "#1d4ed820" : C.border}`,
                  }}>
                    {!m.mine && <div style={{ fontSize: 9, color: C.green, marginBottom: 4, letterSpacing: 0.5, fontFamily: "JetBrains Mono" }}>{m.from}</div>}
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: m.sos ? "#fca5a5" : C.text }}>{m.text}</div>
                    <div style={{ fontSize: 9, color: C.faint, marginTop: 4, textAlign: "right", fontFamily: "JetBrains Mono" }}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SOS Broadcast */}
            <button
              onClick={() => {
                const t = new Date();
                setMeshMsgs((prev) => [...prev, { from: "Me", text: `🚨 SOS BROADCAST — Emergency at ${location.city} (${location.lat}, ${location.lng}) — ALL PEERS RESPOND`, time: `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`, mine: true, sos: true }]);
              }}
              style={{ width: "100%", padding: "10px", background: "#1a0000", border: `1px solid ${C.red}`, borderRadius: 8, color: C.red, cursor: "pointer", fontFamily: "Rajdhani", fontSize: 12, fontWeight: 700, letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <AlertTriangle size={14} /> BROADCAST SOS TO ALL PEERS
            </button>

            {/* Mesh input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={meshInput}
                onChange={(e) => setMeshInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMesh()}
                placeholder="Broadcast to mesh network..."
                style={{ flex: 1, padding: "9px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "Rajdhani" }}
              />
              <button onClick={sendMesh} style={{ padding: "9px 14px", background: "#0d1f18", border: `1px solid ${C.green}`, borderRadius: 8, color: C.green, cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Radio size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ SETTINGS ═══════════ */}
        {tab === "settings" && (
          <div className="slide">
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>SYSTEM CONFIGURATION</div>

            {[
              {
                section: "Emergency Contacts", color: C.red, items: [
                  ["Primary Contact", "Family Member"],
                  ["Emergency Number", "112 (India)"],
                  ["Auto-call on SOS", "Enabled", true],
                  ["Auto-SMS on SOS", "Enabled", true],
                ]
              },
              {
                section: "AI Models", color: C.blue, items: [
                  ["Online Model", "Claude Sonnet 4"],
                  ["Offline Model", "LLaMA 3.1 8B Q4"],
                  ["Local Dataset", "847 protocols"],
                  ["Last Sync", "2 hours ago"],
                ]
              },
              {
                section: "Connectivity", color: C.green, items: [
                  ["Bluetooth Mesh", "Active", true],
                  ["WiFi Direct", "Active", true],
                  ["GPS Tracking", "Enabled", true],
                  ["Mesh Encryption", "AES-256", false],
                ]
              },
              {
                section: "Privacy", color: C.purple, items: [
                  ["Data Retention", "24 hours"],
                  ["Anonymous Mode", "Off"],
                  ["Telemetry", "Disabled"],
                  ["Local Storage Only", "Yes", true],
                ]
              },
            ].map(({ section, color, items }) => (
              <div key={section} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.faint, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  {section.toUpperCase()}
                </div>
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  {items.map(([label, val, active], j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: j < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ fontSize: 13 }}>{label}</span>
                      {active ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 12 }}>
                          <Check size={10} color={C.green} />
                          <span style={{ fontSize: 11, color: C.green, fontFamily: "JetBrains Mono" }}>{val}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: "JetBrains Mono" }}>{val}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* System health */}
            <div style={{ ...cardStyle, padding: "12px 14px", borderLeft: `3px solid ${C.green}` }}>
              <div style={{ fontSize: 10, color: C.green, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>SYSTEM HEALTH</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11, fontFamily: "JetBrains Mono" }}>
                {[["Offline DB", "Synced"], ["AI Models", "Loaded"], ["Mesh", "Active"], ["Encryption", "On"], ["GPS", "Active"], ["Contacts", "3 saved"]].map(([k, v]) => (
                  <div key={k} style={{ color: C.muted }}>{k}: <span style={{ color: C.green }}>{v}</span></div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "10px 14px", background: "#0d0d0d", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10, color: C.faint, fontFamily: "JetBrains Mono", lineHeight: 1.8 }}>
              Guardian AI v2.4.1 · React Native / FastAPI<br />
              Firebase: Auth + Firestore + Storage<br />
              Mesh: BLE 5.0 + WiFi Direct P2P<br />
              Offline AI: Llama.cpp (quantized 4-bit)
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ──────────────────────────────────────────────────── */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "6px 0 10px", flexShrink: 0 }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="tab-btn" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", background: "none", border: "none", cursor: "pointer", color: active ? C.red : C.faint, fontFamily: "Rajdhani", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, transition: "color 0.2s" }}>
              <div style={{ padding: "4px 12px", borderRadius: 6, background: active ? `${C.red}15` : "transparent", transition: "background 0.2s" }}>
                <Icon size={17} />
              </div>
              {label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
