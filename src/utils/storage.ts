import { Appointment, ClientRecord, Professional, SalonInfo } from '../types';
import {
  initialAppointments,
  initialClients,
  initialProfessionals,
  initialSalonInfo,
} from '../data/initialData';

const STORAGE_KEYS = {
  PROFESSIONALS: 'turnos_erika_professionals_v4',
  CLIENTS: 'turnos_erika_clients_v4',
  APPOINTMENTS: 'turnos_erika_appointments_v4',
  SALON_INFO: 'turnos_erika_salon_info_v4',
};

// Safe LocalStorage helpers

export const getStoredSalonInfo = (): SalonInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALON_INFO);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading salon info:', e);
  }
  return initialSalonInfo;
};

export const saveStoredSalonInfo = (info: SalonInfo) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SALON_INFO, JSON.stringify(info));
    window.dispatchEvent(new Event('turnos_data_updated'));
  } catch (e) {
    console.error('Error saving salon info:', e);
  }
};

export const getStoredProfessionals = (): Professional[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFESSIONALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading professionals:', e);
  }
  return initialProfessionals;
};

export const saveStoredProfessionals = (professionals: Professional[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(professionals));
    window.dispatchEvent(new Event('turnos_data_updated'));
  } catch (e) {
    console.error('Error saving professionals:', e);
  }
};

export const getStoredClients = (): ClientRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading clients:', e);
  }
  return [];
};

export const saveStoredClients = (clients: ClientRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    window.dispatchEvent(new Event('turnos_data_updated'));
  } catch (e) {
    console.error('Error saving clients:', e);
  }
};

export const getStoredAppointments = (): Appointment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Exclude only the old mock seed IDs
        const legacyMockIds = new Set(['apt-101', 'apt-102', 'apt-103', 'apt-104', 'apt-105']);
        return parsed.filter((a) => !legacyMockIds.has(a.id));
      }
    }
  } catch (e) {
    console.error('Error loading appointments:', e);
  }
  return [];
};

export const saveStoredAppointments = (appointments: Appointment[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    window.dispatchEvent(new Event('turnos_data_updated'));
  } catch (e) {
    console.error('Error saving appointments:', e);
  }
};

// Tombstone tracking for deleted items (ensures intentional deletions aren't resurrected while protecting offline additions)
export const getDeletedClientIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('erika_deleted_client_ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
};

export const markClientAsDeleted = (id: string) => {
  try {
    const set = getDeletedClientIds();
    set.add(id);
    localStorage.setItem('erika_deleted_client_ids', JSON.stringify(Array.from(set)));
  } catch (e) {}
};

export const getDeletedAppointmentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem('erika_deleted_apt_ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
};

export const markAppointmentAsDeleted = (id: string) => {
  try {
    const set = getDeletedAppointmentIds();
    set.add(id);
    localStorage.setItem('erika_deleted_apt_ids', JSON.stringify(Array.from(set)));
  } catch (e) {}
};
