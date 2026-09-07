import { initializeApp, getApps, getApp } from 'firebase/app';
import {
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
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the provisioned database
export const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Collection References
export const clientsCol = collection(db, 'clients');
export const appointmentsCol = collection(db, 'appointments');
export const professionalsCol = collection(db, 'professionals');
export const salonConfigDoc = doc(db, 'salon_config', 'main');

// ==========================================
// REAL-TIME LISTENERS
// ==========================================

export const subscribeToClients = (callback: (clients: ClientRecord[]) => void) => {
  return onSnapshot(
    clientsCol,
    (snapshot) => {
      const items: ClientRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ClientRecord);
      });
      callback(items);
    },
    (error) => {
      console.warn('Error reading clients from Firestore:', error);
    }
  );
};

export const subscribeToAppointments = (callback: (appointments: Appointment[]) => void) => {
  return onSnapshot(
    appointmentsCol,
    (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Appointment);
      });
      callback(items);
    },
    (error) => {
      console.warn('Error reading appointments from Firestore:', error);
    }
  );
};

export const subscribeToProfessionals = (callback: (professionals: Professional[]) => void) => {
  return onSnapshot(
    professionalsCol,
    (snapshot) => {
      const items: Professional[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Professional);
      });
      if (items.length > 0) {
        callback(items);
      }
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
    await setDoc(doc(db, 'clients', client.id), client, { merge: true });
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
    await setDoc(doc(db, 'appointments', appointment.id), appointment, { merge: true });
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
    const existing = await getDocs(clientsCol);
    const batch = writeBatch(db);
    const incomingIds = new Set(clients.map((c) => c.id));

    // Delete removed clients
    existing.forEach((docSnap) => {
      if (!incomingIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Set new/updated clients
    clients.forEach((client) => {
      batch.set(doc(db, 'clients', client.id), client);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing clients to Firebase:', error);
  }
};

export const syncAllAppointmentsToFirebase = async (appointments: Appointment[]) => {
  try {
    const existing = await getDocs(appointmentsCol);
    const batch = writeBatch(db);
    const incomingIds = new Set(appointments.map((a) => a.id));

    // Delete removed appointments
    existing.forEach((docSnap) => {
      if (!incomingIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Set new/updated appointments
    appointments.forEach((apt) => {
      batch.set(doc(db, 'appointments', apt.id), apt);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing appointments to Firebase:', error);
  }
};

export const saveProfessionalsToFirebase = async (professionals: Professional[]) => {
  try {
    const batch = writeBatch(db);
    professionals.forEach((p) => {
      batch.set(doc(db, 'professionals', p.id), p);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error saving professionals to Firebase:', error);
  }
};

export const saveSalonInfoToFirebase = async (info: SalonInfo) => {
  try {
    await setDoc(salonConfigDoc, info, { merge: true });
  } catch (error) {
    console.error('Error saving salon info to Firebase:', error);
  }
};
