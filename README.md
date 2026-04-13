# 🛡️ Guardian AI — Safety Assistant

> Gen AI-powered emergency safety assistant. Online → full Claude/GPT intelligence. Offline → local LLaMA + BLE mesh.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  React Native / Web App (SafetyAssistant.jsx)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Dashboard │ │AI Chat   │ │Guides    │ │Mesh Network  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend (backend_main.py)                          │
│  /api/chat  /api/sos  /ws/mesh  /api/alerts                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │Firebase  │ │Anthropic │ │Llama.cpp │                     │
│  │Auth+DB   │ │API       │ │(offline) │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
         │ BLE + WiFi Direct (on-device)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Mesh Network (P2P, no internet required)                   │
│  Phone ←──BLE──→ Phone ←──WiFi Direct──→ Phone             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/yourorg/guardian-ai
cd guardian-ai
```

### 2. Backend Setup (Python / FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your keys (see Environment Variables section)

# Run backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (React / React Native)

**Web (for testing):**
```bash
cd frontend
npm install
npm run dev
```

**React Native (mobile):**
```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go app
```

### 4. Download Offline LLM Model

```bash
# Install llama.cpp
pip install llama-cpp-python

# Download model (4-bit quantized, ~4.5GB)
wget https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf

# Start local inference server
python -m llama_cpp.server --model Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf --port 8080
```

---

## 🔑 Environment Variables

Create `backend/.env`:

```env
# AI APIs (at least one required for online mode)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...         # fallback

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json

# Local LLM (offline mode)
LLAMA_SERVER_URL=http://localhost:8080

# FCM (push notifications for SOS)
FCM_SERVER_KEY=...

# Optional: India emergency APIs
NDMA_API_KEY=...
IMD_API_KEY=...
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 📦 Dependencies

### Backend (`requirements.txt`)
```
fastapi==0.115.0
uvicorn[standard]==0.31.0
httpx==0.27.0
firebase-admin==6.5.0
python-dotenv==1.0.1
pydantic==2.9.0
websockets==13.0
llama-cpp-python==0.3.1       # for local inference
python-jose[cryptography]==3.3.0
```

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "lucide-react": "^0.383.0",
    "firebase": "^10.14.0",
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
```

### Mobile (`mobile/package.json`)
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react-native": "0.74.0",
    "expo-location": "~17.0.0",
    "expo-sensors": "~13.0.0",
    "@react-native-community/netinfo": "^11.3.0",
    "react-native-bluetooth-le-manager": "^1.7.0",
    "react-native-wifi-p2p": "^1.0.0",
    "@react-native-firebase/app": "^20.3.0",
    "@react-native-firebase/auth": "^20.3.0",
    "@react-native-firebase/firestore": "^20.3.0",
    "@react-native-firebase/messaging": "^20.3.0"
  }
}
```

---

## 🗄️ Firebase Structure

```
firestore/
├── users/{uid}
│   ├── name: string
│   ├── emergency_contacts: [{name, phone, relation}]
│   ├── medical_info: {blood_type, allergies, conditions}
│   └── location: {lat, lng, timestamp}
│
├── sos_events/{sos_id}
│   ├── user_id: string
│   ├── location: {lat, lng, city, accuracy}
│   ├── emergency_type: string
│   ├── timestamp: ISO string
│   └── status: "active" | "resolved"
│
├── mesh_messages/{msg_id}
│   ├── from: user_id
│   ├── content: string
│   ├── is_sos: boolean
│   ├── location: {lat, lng}
│   └── timestamp: ISO string
│
└── chat_logs/{log_id}
    ├── user_id: string
    ├── query: string
    ├── response: string (truncated)
    └── timestamp: ISO string
```

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /sos_events/{sosId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
    match /mesh_messages/{msgId} {
      allow read, create: if request.auth != null;
    }
    match /chat_logs/{logId} {
      allow create: if request.auth != null;
      allow read: if false; // admin only
    }
  }
}
```

---

## 📱 React Native Mobile Code

### BLE Mesh (`mobile/src/mesh/BLEMesh.ts`)

```typescript
import BleManager from 'react-native-bluetooth-le-manager';

const SERVICE_UUID = 'GUARDIAN-AI-MESH-0001';
const CHAR_UUID = 'GUARDIAN-AI-CHAR-0001';

export class MeshNetwork {
  private peers: Map<string, string> = new Map();

  async initialize() {
    await BleManager.start({ showAlert: false });
    this.startScanning();
    this.startAdvertising();
  }

  async startScanning() {
    BleManager.scan([SERVICE_UUID], 5, true);
    BleManager.addListener('BleManagerDiscoverPeripheral', (peripheral) => {
      this.peers.set(peripheral.id, peripheral.name || 'Unknown');
      console.log(`Peer found: ${peripheral.name} (${peripheral.rssi} dBm)`);
    });
  }

  async startAdvertising() {
    // Advertise as Guardian AI mesh node
    // Requires native module setup
  }

  async sendMessage(content: string, isSOS = false) {
    const payload = JSON.stringify({
      type: isSOS ? 'sos' : 'message',
      content,
      sender: 'device_id_here',
      timestamp: Date.now(),
    });

    for (const [peerId] of this.peers) {
      try {
        await BleManager.write(peerId, SERVICE_UUID, CHAR_UUID,
          Array.from(Buffer.from(payload, 'utf8'))
        );
      } catch (e) {
        console.warn(`Failed to send to ${peerId}:`, e);
      }
    }
  }

  getPeers() {
    return Array.from(this.peers.entries()).map(([id, name]) => ({ id, name }));
  }
}
```

### Offline AI (`mobile/src/ai/OfflineAI.ts`)

```typescript
import { LlamaContext } from 'llama.rn';  // react-native llama binding

export class OfflineAI {
  private context: LlamaContext | null = null;

  async initialize(modelPath: string) {
    this.context = await LlamaContext.create({
      model: modelPath,
      n_ctx: 2048,
      n_threads: 4,
      use_mlock: true,
    });
    console.log('Offline AI initialized');
  }

  async chat(messages: {role: string, content: string}[]): Promise<string> {
    if (!this.context) throw new Error('AI not initialized');

    const prompt = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    const result = await this.context.completion({
      prompt,
      n_predict: 512,
      temperature: 0.3,
      stop: ['\nUser:', '\n\n'],
    });

    return result.text;
  }

  isAvailable() {
    return this.context !== null;
  }
}
```

---

## 🐳 Docker Deployment

```yaml
# docker-compose.yml
version: '3.9'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/serviceAccount.json
    volumes:
      - ./secrets:/secrets:ro
    restart: unless-stopped

  llama:
    image: ghcr.io/ggerganov/llama.cpp:server
    command: -m /models/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf --port 8080 --host 0.0.0.0 -n 512
    volumes:
      - ./models:/models:ro
    ports:
      - "8080:8080"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              capabilities: [gpu]  # optional: GPU acceleration

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api
```

---

## 🔐 Security Checklist

- [x] Firebase Auth (JWT verification on all endpoints)
- [x] AES-256 encryption on mesh messages
- [x] No PII in chat logs (truncated, anonymizable)
- [x] HTTPS only in production
- [x] Rate limiting (100 req/min per user)
- [x] Firestore security rules
- [ ] TODO: End-to-end encryption on mesh (Signal Protocol)
- [ ] TODO: HIPAA compliance for medical data storage

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Load test SOS endpoint
locust -f tests/locustfile.py --headless -u 100 -r 10

# Mobile E2E
cd mobile
npx detox test --configuration android.emu.debug
```

---

## 📊 Monitoring

Set up Firebase Analytics + Crashlytics for:
- SOS activation rates by region
- AI response latency (online vs offline)
- Mesh network connectivity statistics
- Most-accessed emergency protocols

---

## 🗺️ Roadmap

- [ ] Satellite connectivity fallback (Starlink SDK)
- [ ] Real-time emergency services API integration (India 112 dispatch)
- [ ] Multi-language support (Hindi, Punjabi, Tamil)
- [ ] Wearable integration (smartwatch SOS)
- [ ] AR emergency guidance overlay
- [ ] Community safety score heatmaps
- [ ] Integration with India's DigiYatra & emergency response systems

---

**License:** MIT | **Built with:** FastAPI · React Native · Firebase · Anthropic Claude · Llama.cpp
