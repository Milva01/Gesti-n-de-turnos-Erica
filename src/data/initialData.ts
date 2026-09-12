import { Professional, ClientRecord, Appointment, SalonInfo } from '../types';

export const initialSalonInfo: SalonInfo = {
  name: 'Erika Valentini',
  tagline: 'Estilo en tus cabellos',
  startHour: '06:30',
  endHour: '14:00',
  slotIntervalMinutes: 30,
  slotsPerSegment: 2,
};

// Las DOS profesionales de la empresa
export const initialProfessionals: Professional[] = [
  {
    id: 'prof-1',
    name: 'Erica Valentini',
    role: 'Directora Creativa & Master Stylist',
    avatarUrl: '/erica.jpg',
    specialty: 'Diseño de Corte de Autor, Colorimetría Avanzada & Asesoría de Imagen',
    bio: 'Con más de 25 años de trayectoria en alta peluquería, Erica lidera el salón combinando técnicas de vanguardia con un trato cálido y personalizado. Su enfoque busca resaltar la esencia natural de cada clienta con brillo, armonía y cuidado profundo de la salud capilar.',
    phone: '+54 9 11 5555-1001',
    rating: 4.98,
    reviewsCount: 312,
  },
  {
    id: 'prof-2',
    name: 'Valentina Rossi',
    role: 'Estilista Senior & Especialista en Color',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    specialty: 'Balayage, Babylights, Tratamientos Biomiméticos & Peinados',
    bio: 'Especializada en técnicas de iluminación sutil y degradados orgánicos sin demarcación. Apasionada por los tratamientos de nutrición profunda, alisados progresivos libres de químicos agresivos y el perfeccionamiento de texturas naturales.',
    phone: '+54 9 11 5555-1002',
    rating: 4.95,
    reviewsCount: 224,
  },
];

// Helper to get dates
const getRelativeDateStr = (dayOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
};

// Lista inicial de clientas vacía (lista para cargar fichas reales de clientas)
export const initialClients: ClientRecord[] = [];

// Horarios de 6:30 a 14:00 cada 30 min
export const AGENDA_TIME_SLOTS = [
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
];

// Lista inicial de turnos vacía (lista para cargar agenda real)
export const initialAppointments: Appointment[] = [];
