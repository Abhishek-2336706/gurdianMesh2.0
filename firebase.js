// firebase.js — Guardian AI Firebase Configuration + Service Layer
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, collection,
  addDoc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ─── Firebase Config (replace with your project values) ──────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const signInAnon = () => signInAnonymously(auth);

export const getCurrentUser = () =>
  new Promise((resolve) => onAuthStateChanged(auth, resolve));

// ─── User Profile ─────────────────────────────────────────────────────────────
export const saveProfile = async (uid, profile) => {
  await setDoc(doc(db, "users", uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
};

export const getProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

// ─── SOS Events ───────────────────────────────────────────────────────────────
export const createSOSEvent = async (uid, location, emergencyType = "general") => {
  const ref = await addDoc(collection(db, "sos_events"), {
    user_id: uid,
    location,
    emergency_type: emergencyType,
    status: "active",
    timestamp: serverTimestamp(),
  });
  return ref.id;
};

export const resolveSOSEvent = async (sosId) => {
  await setDoc(doc(db, "sos_events", sosId), { status: "resolved" }, { merge: true });
};

export const subscribeToSOSEvents = (uid, callback) => {
  const q = query(
    collection(db, "sos_events"),
    where("user_id", "==", uid),
    orderBy("timestamp", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
};

// ─── Mesh Messages (Firestore relay for server-side mesh simulation) ──────────
export const sendMeshMessage = async (uid, content, location = null, isSOS = false) => {
  await addDoc(collection(db, "mesh_messages"), {
    from: uid,
    content,
    location,
    is_sos: isSOS,
    timestamp: serverTimestamp(),
  });
};

export const subscribeMeshMessages = (callback, limitCount = 50) => {
  const q = query(
    collection(db, "mesh_messages"),
    orderBy("timestamp", "desc")
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .slice(0, limitCount)
      .reverse();
    callback(msgs);
  });
};

// ─── Push Notifications (FCM) ─────────────────────────────────────────────────
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    // Save FCM token to user profile for server-side targeting
    const user = auth.currentUser;
    if (user && token) {
      await setDoc(doc(db, "users", user.uid), { fcm_token: token }, { merge: true });
    }

    return token;
  } catch (err) {
    console.warn("FCM permission denied:", err);
    return null;
  }
};

export const onFCMMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log("FCM message received:", payload);
    callback(payload);
  });
};

// ─── Location Utilities ───────────────────────────────────────────────────────
export const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: new Date().toISOString(),
      }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

export const watchLocation = (callback) => {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (pos) => callback({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    }),
    null,
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
};

export const clearLocationWatch = (watchId) => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
};

// ─── Chat Log ─────────────────────────────────────────────────────────────────
export const logChat = async (uid, query, response) => {
  try {
    await addDoc(collection(db, "chat_logs"), {
      user_id: uid,
      query: query.slice(0, 200),
      response: response.slice(0, 500),
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    // Non-critical — swallow silently
  }
};

export default app;
