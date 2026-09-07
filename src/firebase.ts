import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Appointment, ClientRecord, Professional, SalonInfo } from './types';
import appletConfig from '../firebase-applet-config.json';

const rawConfig = appletConfig || ({} as any);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig.appId || '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const targetDatabaseId =
  import.meta.env.VITE_FIRESTORE_DATABASE_ID || rawConfig.firestoreDatabaseId || undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    targetDatabaseId
  );
} catch (e) {
  firestoreInstance = targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
}

// Connect to the provisioned database with offline persistence & multi-tab sync
export const db = firestoreInstance;

// Helper to eliminate `undefined` fields which cause Firestore write errors
export const cleanForFirestore = <T>(data: T): any => {
  return JSON.parse(JSON.stringify(data, (_, value) => (value === undefined ? null : value)));
};

// Collection References
export const clientsCol = collection(db, 'clients');
export const appointmentsCol = collection(db, 'appointments');
export const professionalsCol = collection(db, 'professionals');
export const salonConfigDoc = doc(db, 'salon_config', 'main');

// ==========================================
// REAL-TIME LISTENERS
// ==========================================

export const subscribeToClients = (callback: (clients: ClientRecord[], isEmpty: boolean) => void) => {
  return onSnapshot(
    clientsCol,
    (snapshot) => {
      const items: ClientRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ClientRecord);
      });
      callback(items, snapshot.empty);
    },
    (error) => {
      console.warn('Error reading clients from Firestore:', error);
    }
  );
};

export const subscribeToAppointments = (callback: (appointments: Appointment[], isEmpty: boolean) => void) => {
  return onSnapshot(
    appointmentsCol,
    (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Appointment);
      });
      callback(items, snapshot.empty);
    },
    (error) => {
      console.warn('Error reading appointments from Firestore:', error);
    }
  );
};

export const subscribeToProfessionals = (callback: (professionals: Professional[], isEmpty: boolean) => void) => {
  return onSnapshot(
    professionalsCol,
    (snapshot) => {
      const items: Professional[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Professional);
      });
      callback(items, snapshot.empty);
    },
    (error) => {
      console.warn('Error reading professionals from Firestore:', error);
    }
  );
};

export const subscribeToSalonInfo = (callback: (info: SalonInfo) => void) => {
  return onSnapshot(
    salonConfigDoc,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SalonInfo);
      }
    },
    (error) => {
      console.warn('Error reading salon info from Firestore:', error);
    }
  );
};

// ==========================================
// SYNC ACTIONS (WRITES)
// ==========================================

export const saveClientToFirebase = async (client: ClientRecord) => {
  try {
    const clean = cleanForFirestore(client);
    await setDoc(doc(db, 'clients', client.id), clean, { merge: true });
  } catch (error) {
    console.error('Error saving client to Firebase:', error);
  }
};

export const deleteClientFromFirebase = async (clientId: string) => {
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    console.error('Error deleting client from Firebase:', error);
  }
};

export const saveAppointmentToFirebase = async (appointment: Appointment) => {
  try {
    const clean = cleanForFirestore(appointment);
    await setDoc(doc(db, 'appointments', appointment.id), clean, { merge: true });
  } catch (error) {
    console.error('Error saving appointment to Firebase:', error);
  }
};

export const deleteAppointmentFromFirebase = async (appointmentId: string) => {
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId));
  } catch (error) {
    console.error('Error deleting appointment from Firebase:', error);
  }
};

export const syncAllClientsToFirebase = async (clients: ClientRecord[]) => {
  try {
    if (!clients || clients.length === 0) return;
    
    // Chunk in batches of 400 to comply with Firestore 500 ops limit
    const chunkSize = 400;
    for (let i = 0; i < clients.length; i += chunkSize) {
      const chunk = clients.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((client) => {
        const clean = cleanForFirestore(client);
        batch.set(doc(db, 'clients', client.id), clean, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error syncing clients to Firebase:', error);
  }
};

export const clearAllClientsFromFirebase = async () => {
  try {
    const existing = await getDocs(clientsCol);
    const batch = writeBatch(db);
    existing.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error clearing clients from Firebase:', error);
  }
};

export const syncAllAppointmentsToFirebase = async (appointments: Appointment[]) => {
  try {
    if (!appointments || appointments.length === 0) return;

    // Chunk in batches of 400 to comply with Firestore 500 ops limit
    const chunkSize = 400;
    for (let i = 0; i < appointments.length; i += chunkSize) {
      const chunk = appointments.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((apt) => {
        const clean = cleanForFirestore(apt);
        batch.set(doc(db, 'appointments', apt.id), clean, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error syncing appointments to Firebase:', error);
  }
};

export const clearAllAppointmentsFromFirebase = async () => {
  try {
    const existing = await getDocs(appointmentsCol);
    const batch = writeBatch(db);
    existing.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error clearing appointments from Firebase:', error);
  }
};

export const saveProfessionalsToFirebase = async (professionals: Professional[]) => {
  try {
    const batch = writeBatch(db);
    professionals.forEach((p) => {
      const clean = cleanForFirestore(p);
      batch.set(doc(db, 'professionals', p.id), clean);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error saving professionals to Firebase:', error);
  }
};

export const saveSalonInfoToFirebase = async (info: SalonInfo) => {
  try {
    const clean = cleanForFirestore(info);
    await setDoc(salonConfigDoc, clean, { merge: true });
  } catch (error) {
    console.error('Error saving salon info to Firebase:', error);
  }
};

// Live connectivity diagnostic test
export const testFirestoreConnection = async (): Promise<{
  ok: boolean;
  message: string;
  clientsCount: number;
  appointmentsCount: number;
  latencyMs: number;
}> => {
  const start = Date.now();
  try {
    const clientsSnap = await getDocs(clientsCol);
    const aptsSnap = await getDocs(appointmentsCol);
    // Ping write test
    const pingRef = doc(db, 'system', 'connection_test');
    await setDoc(pingRef, { timestamp: new Date().toISOString(), origin: window?.location?.origin || 'unknown' });
    const latency = Date.now() - start;
    return {
      ok: true,
      message: `Conexión Firebase activa y validada (${latency}ms). Firestore en la nube responde con éxito.`,
      clientsCount: clientsSnap.size,
      appointmentsCount: aptsSnap.size,
      latencyMs: latency,
    };
  } catch (err: any) {
    console.error('Error testing Firestore connection:', err);
    return {
      ok: false,
      message: `Error de conexión con Firebase: ${err?.message || 'No se pudo contactar a Firestore'}`,
      clientsCount: 0,
      appointmentsCount: 0,
      latencyMs: Date.now() - start,
    };
  }
};

