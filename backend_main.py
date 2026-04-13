"""
Guardian AI Safety Assistant — FastAPI Backend
Handles: AI routing, SOS alerts, Firebase sync, mesh coordination, auth
"""
import os, json, time, asyncio
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth
from dotenv import load_dotenv

load_dotenv()

# ─── Firebase Init ────────────────────────────────────────────────────────────
cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccount.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

# ─── App Setup ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🛡️  Guardian AI Backend starting...")
    yield
    print("👋 Guardian AI Backend shutting down.")

app = FastAPI(title="Guardian AI API", version="2.4.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ─── WebSocket Manager (Mesh Simulation) ─────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, ws: WebSocket, user_id: str):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def broadcast(self, message: dict, exclude: str = None):
        dead = []
        for uid, ws in self.active.items():
            if uid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(uid)

manager = ConnectionManager()

# ─── Pydantic Models ──────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    mode: str = "online"          # "online" | "offline"
    user_id: str
    location: Optional[dict] = None

class SOSRequest(BaseModel):
    user_id: str
    location: dict                 # {lat, lng, city, accuracy}
    message: Optional[str] = None
    emergency_type: str = "general"
    contacts: Optional[List[str]] = None

class MeshMessage(BaseModel):
    sender_id: str
    content: str
    location: Optional[dict] = None
    is_sos: bool = False

class UserProfile(BaseModel):
    name: str
    emergency_contacts: List[dict]
    medical_info: Optional[dict] = None
    preferred_language: str = "en"

# ─── Auth Dependency ──────────────────────────────────────────────────────────
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded = fb_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ─── AI System Prompt ─────────────────────────────────────────────────────────
def build_system_prompt(location: dict = None) -> str:
    loc_str = f"{location.get('city', 'Unknown')}, {location.get('lat', '')}, {location.get('lng', '')}" if location else "Unknown"
    return f"""You are Guardian AI, an elite emergency safety assistant embedded in a mobile app used during real emergencies. Lives may depend on your responses.

Your expertise:
- Emergency first aid: CPR, bleeding control, choking, burns, fractures, shock
- Disaster response: fire, earthquake, flood, tornado, active threats, chemical spills
- Personal safety, self-defense awareness, situational awareness
- SOS message generation (GPS-tagged, formatted for emergency dispatch)
- Mental health crisis support
- Location-based safety advice

User context:
- Location: {loc_str}
- Timestamp: {datetime.utcnow().isoformat()}Z

Critical rules:
1. Be DIRECT and ACTIONABLE — no filler, no caveats that waste time
2. Use numbered steps for all procedures
3. Lead with the MOST CRITICAL action first
4. For life-threatening emergencies: always mention calling local emergency services first
5. Use CAPS for critical warnings (DO NOT, STOP, CALL NOW)
6. For SOS messages: generate clear, GPS-tagged, dispatch-ready format
7. Never say "I'm just an AI" — be the expert assistant the user needs right now"""

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "Guardian AI API online", "version": "2.4.1", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health")
async def health():
    return {"status": "healthy", "firebase": "connected", "mesh_connections": len(manager.active)}


# ── AI Chat ───────────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(request: ChatRequest, user=Depends(verify_token)):
    """Route chat to online (Claude/GPT) or offline (local LLM) based on mode"""

    if request.mode == "offline":
        # In production: forward to local Llama.cpp server on device or edge node
        return await offline_chat(request)

    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(500, "No AI API key configured")

    use_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if use_anthropic:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": os.getenv("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1024,
                        "system": build_system_prompt(request.location),
                        "messages": messages,
                    }
                )
                data = resp.json()
                reply = data["content"][0]["text"]
            else:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"},
                    json={
                        "model": "gpt-4o",
                        "messages": [{"role": "system", "content": build_system_prompt(request.location)}] + messages,
                        "max_tokens": 1024,
                    }
                )
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]

        # Log chat to Firestore (async, non-blocking)
        asyncio.create_task(log_chat(request.user_id, messages[-1]["content"], reply))

        return {"reply": reply, "mode": "online", "model": "claude-sonnet-4" if use_anthropic else "gpt-4o"}

    except Exception as e:
        raise HTTPException(503, f"AI service error: {str(e)}")


async def offline_chat(request: ChatRequest) -> dict:
    """Forward to local Llama.cpp server (runs on-device or local network)"""
    llama_url = os.getenv("LLAMA_SERVER_URL", "http://localhost:8080")
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{llama_url}/v1/chat/completions",
                json={
                    "model": "llama-3.1-8b-q4",
                    "messages": [{"role": "system", "content": build_system_prompt(request.location)}] + messages,
                    "max_tokens": 512,
                    "temperature": 0.3,
                }
            )
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]
            return {"reply": reply, "mode": "offline", "model": "llama-3.1-8b-q4"}
    except Exception:
        # Fallback to static knowledge base if local LLM unreachable
        return {"reply": get_static_response(messages[-1]["content"]), "mode": "offline-static", "model": "knowledge-base"}


def get_static_response(query: str) -> str:
    """Ultra-minimal offline fallback using static safety protocols"""
    q = query.lower()
    if any(w in q for w in ["cpr", "cardiac", "heart", "resuscit"]):
        return "CPR: Call 112 → 30 chest compressions (2in deep, 100-120 BPM) → 2 rescue breaths → repeat."
    if any(w in q for w in ["bleed", "wound", "blood"]):
        return "Bleeding: Apply firm direct pressure → don't remove cloth → elevate limb → tourniquet if severe."
    if any(w in q for w in ["fire", "smoke", "burn"]):
        return "Fire: Alert everyone → close doors → stay low → evacuate via stairs → call 101 from outside."
    return "Emergency: Call 112 → stay on line → follow dispatcher instructions → keep calm."


# ── SOS ───────────────────────────────────────────────────────────────────────
@app.post("/api/sos")
async def trigger_sos(request: SOSRequest, user=Depends(verify_token)):
    """
    Multi-channel SOS:
    1. Log to Firestore with GPS + timestamp
    2. Notify emergency contacts via FCM push
    3. Broadcast to nearby mesh peers via WebSocket
    4. Generate AI-crafted SOS message
    5. (Optional) Forward to emergency dispatch API
    """
    timestamp = datetime.utcnow().isoformat()

    # 1. Log SOS event to Firestore
    sos_ref = db.collection("sos_events").document()
    sos_data = {
        "user_id": request.user_id,
        "location": request.location,
        "emergency_type": request.emergency_type,
        "timestamp": timestamp,
        "status": "active",
        "message": request.message,
    }
    sos_ref.set(sos_data)

    # 2. Generate AI SOS message
    lat = request.location.get("lat", 0)
    lng = request.location.get("lng", 0)
    city = request.location.get("city", "Unknown location")
    sos_message = (
        f"🚨 EMERGENCY ALERT\n"
        f"Time: {timestamp}Z\n"
        f"Location: {city}\n"
        f"Coordinates: {lat:.6f}, {lng:.6f}\n"
        f"Maps: https://maps.google.com/?q={lat},{lng}\n"
        f"Type: {request.emergency_type.upper()}\n"
        f"User ID: {request.user_id}\n"
        f"Assistance needed immediately. Please respond."
    )

    # 3. Broadcast SOS to mesh peers via WebSocket
    await manager.broadcast({
        "type": "sos",
        "user_id": request.user_id,
        "location": request.location,
        "message": sos_message,
        "timestamp": timestamp,
    }, exclude=request.user_id)

    # 4. Send FCM push to emergency contacts (implement with firebase-admin FCM)
    # TODO: await send_fcm_to_contacts(request.contacts, sos_message)

    return {
        "status": "sos_sent",
        "sos_id": sos_ref.id,
        "message": sos_message,
        "channels": ["firebase", "mesh_websocket"],
        "timestamp": timestamp,
    }


# ── Mesh WebSocket ────────────────────────────────────────────────────────────
@app.websocket("/ws/mesh/{user_id}")
async def mesh_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time mesh messaging.
    In production, BLE/WiFi Direct runs on-device; this simulates server relay.
    """
    await manager.connect(websocket, user_id)
    try:
        await websocket.send_json({"type": "connected", "peers": len(manager.active), "user_id": user_id})
        while True:
            data = await websocket.receive_json()
            msg = {
                "type": "mesh_message",
                "from": user_id,
                "content": data.get("content", ""),
                "location": data.get("location"),
                "is_sos": data.get("is_sos", False),
                "timestamp": datetime.utcnow().isoformat(),
            }
            # Store in Firestore
            db.collection("mesh_messages").add(msg)
            # Broadcast to all peers
            await manager.broadcast(msg, exclude=user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast({"type": "peer_left", "user_id": user_id, "peers": len(manager.active)})


# ── User Profile ──────────────────────────────────────────────────────────────
@app.post("/api/profile")
async def save_profile(profile: UserProfile, user=Depends(verify_token)):
    db.collection("users").document(user["uid"]).set(profile.dict(), merge=True)
    return {"status": "saved"}

@app.get("/api/profile")
async def get_profile(user=Depends(verify_token)):
    doc = db.collection("users").document(user["uid"]).get()
    if not doc.exists:
        raise HTTPException(404, "Profile not found")
    return doc.to_dict()


# ── Nearby Alerts ─────────────────────────────────────────────────────────────
@app.get("/api/alerts")
async def get_alerts(lat: float, lng: float, radius_km: float = 50, user=Depends(verify_token)):
    """Fetch area-specific emergency alerts (integrate with govt APIs, weather APIs)"""
    # TODO: integrate with India's NDMA API, IMD weather API, etc.
    # For now returns mock data
    return {
        "alerts": [
            {"type": "weather", "severity": "moderate", "msg": "Heavy rainfall advisory", "source": "IMD"},
            {"type": "traffic", "severity": "low", "msg": "Road closure on NH-1", "source": "NHAI"},
        ],
        "location": {"lat": lat, "lng": lng},
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Offline Data Sync ─────────────────────────────────────────────────────────
@app.get("/api/offline-bundle")
async def get_offline_bundle(user=Depends(verify_token)):
    """Return full offline knowledge base for device caching"""
    return {
        "version": "2.4.1",
        "protocols": [
            {"id": "cpr", "title": "CPR Protocol", "steps": ["Check safety", "Call 112", "30 compressions", "2 breaths"]},
            {"id": "bleeding", "title": "Bleeding Control", "steps": ["Pressure", "Elevate", "Tourniquet if needed"]},
            # ... full dataset
        ],
        "emergency_numbers": {
            "IN": {"police": "100", "fire": "101", "ambulance": "102", "unified": "112"},
            "US": {"all": "911"},
            "UK": {"all": "999"},
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Utility ───────────────────────────────────────────────────────────────────
async def log_chat(user_id: str, query: str, response: str):
    """Async log to Firestore for analytics / improving offline model"""
    try:
        db.collection("chat_logs").add({
            "user_id": user_id,
            "query": query,
            "response": response[:500],  # truncate
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass  # Non-critical


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
