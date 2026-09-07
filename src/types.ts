export interface Professional {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  specialty: string;
  bio: string; // Reseña profesional editable
  phone?: string;
  rating?: number;
  reviewsCount?: number;
}

export type AppointmentStatus = 'confirmado' | 'en_proceso' | 'completado' | 'cancelado';

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // '06:30', '07:00', etc.
  slotNumber: 1 | 2; // Dos turnos en cada segmento horario
  professionalId: string; // ID de la profesional asignada
  clientId?: string;
  clientName: string;
  clientPhone: string;
  treatmentNote?: string; // Motivo / tratamiento a realizar
  status: AppointmentStatus;
  amount?: number;
  paidAmount?: number;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  date: string;
  amount: number;
  concept: string;
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro';
}

export interface ClientRecord {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  technicalNotes?: string; // Fórmulas de color, cuidados, preferencias
  lastVisit?: string; // YYYY-MM-DD (última visita previa)
  nextVisit?: string; // YYYY-MM-DD (próxima visita agendada)
  balanceDebt: number; // Saldo deudor actual ("Debe")
  totalPaid: number; // Historial total abonado
  payments: ClientPayment[];
  createdAt: string;
}

export interface SalonInfo {
  name: string;
  tagline: string;
  startHour: string; // '06:30'
  endHour: string; // '14:00'
  slotIntervalMinutes: number; // 30
  slotsPerSegment: number; // 2
}
