import React, { useState, useRef } from 'react';
import { Professional, Appointment } from '../types';
import { Sparkles, Edit3, Check, X, Star, Calendar, Scissors, Award, Camera, Upload, Image as ImageIcon } from 'lucide-react';

interface ProfessionalsViewProps {
  professionals: Professional[];
  appointments: Appointment[];
  onProfessionalsChange: (updated: Professional[]) => void;
  onNavigateToAgenda?: (professionalId?: string) => void;
}

export const ProfessionalsView: React.FC<ProfessionalsViewProps> = ({
  professionals,
  appointments,
  onProfessionalsChange,
  onNavigateToAgenda,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Professional | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleStartEdit = (prof: Professional) => {
    setEditingId(prof.id);
    setEditForm({ ...prof });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setEditForm((prev) => (prev ? { ...prev, avatarUrl: base64Url } : null));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    const updated = professionals.map((p) => (p.id === editForm.id ? editForm : p));
    onProfessionalsChange(updated);
    setEditingId(null);
    setSavedSuccess(editForm.id);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-600/10 text-pink-400 border border-pink-500/20 mb-3">
          <Award className="w-3.5 h-3.5" />
          Staff Profesional de Erika Valentini
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Nuestras Profesionales
        </h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Conocé a las dos estilistas a cargo del salón. Podés editar libremente la reseña, rol, especialidad y fotografía de cada una en cualquier momento.
        </p>
      </div>

      {/* Grid of the TWO professionals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {professionals.map((prof) => {
          const isEditing = editingId === prof.id;
          const todayAppointments = appointments.filter(
            (a) => a.date === todayStr && a.professionalId === prof.id && a.status !== 'cancelado'
          );

          return (
            <div
              key={prof.id}
              className="relative bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:border-pink-900/40 flex flex-col justify-between"
            >
              {/* Highlight status banner */}
              {savedSuccess === prof.id && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-bounce">
                  <Check className="w-3.5 h-3.5" /> Reseña actualizada
                </div>
              )}

              {isEditing && editForm ? (
                /* EDIT FORM MODE */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Editando Perfil y Reseña
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/25 hover:from-pink-500 hover:to-rose-500 transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Guardar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Rol / Título</label>
                    <input
                      type="text"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Especialidad Principal</label>
                    <input
                      type="text"
                      value={editForm.specialty}
                      onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Reseña Profesional / Biografía
                    </label>
                    <textarea
                      rows={5}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Escribí aquí la reseña profesional..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-pink-500 leading-relaxed"
                    />
                  </div>

                  {/* Photo Edit & Upload Controls */}
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <label className="block text-xs font-bold text-slate-200">
                      Foto de Perfil / Avatar
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Live Image Preview */}
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-500/50 shrink-0 bg-slate-900 shadow-md">
                        <img
                          src={editForm.avatarUrl}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        {/* Hidden native file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        {/* File Upload Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow-md shadow-pink-600/20 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Subir Foto desde tu Celular o PC
                        </button>

                        {/* URL input fallback */}
                        <div>
                          <input
                            type="text"
                            placeholder="O pegá un link directo a una imagen (https://...)"
                            value={editForm.avatarUrl}
                            onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Avatar Presets */}
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                        O seleccioná una foto de ejemplo de alta calidad:
                      </span>
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                        {[
                          {
                            name: 'Foto Oficial de Erica',
                            url: '/erica.jpg',
                          },
                          {
                            name: 'Estilista 1 (Rubia)',
                            url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&auto=format&fit=crop&q=80',
                          },
                          {
                            name: 'Estilista 2 (Castaña)',
                            url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
                          },
                          {
                            name: 'Estilista 3 (Ondas)',
                            url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                          },
                          {
                            name: 'Estilista 4 (Corte)',
                            url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
                          },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, avatarUrl: preset.url })}
                            className="relative group shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-slate-700 hover:border-pink-500 transition focus:outline-none focus:ring-2 focus:ring-pink-500"
                            title={preset.name}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* READ-ONLY / DISPLAY CARD */
                <div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Professional Photo with interactive edit trigger */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStartEdit(prof)}
                      title="Hacé clic para cambiar la foto o editar la reseña"
                      className="relative group shrink-0 cursor-pointer"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-pink-500/30 group-hover:border-pink-500 p-1 bg-gradient-to-br from-pink-500/20 to-purple-600/10 shadow-xl transition-all duration-300 group-hover:scale-[1.03]">
                        <img
                          src={prof.avatarUrl}
                          alt={prof.name}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Camera Overlay */}
                        <div className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                          <Camera className="w-5 h-5 text-pink-400" />
                          <span>Cambiar foto</span>
                        </div>
                      </div>
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-pink-400 flex items-center gap-1 shadow-md">
                        <Star className="w-3 h-3 fill-pink-500 text-pink-500" />
                        {prof.rating || 5.0}
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {prof.name}
                          </h3>
                          <p className="text-xs font-bold text-pink-400 mt-0.5">
                            {prof.role}
                          </p>
                        </div>

                        <button
                          onClick={() => handleStartEdit(prof)}
                          className="self-center sm:self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-200 hover:text-white border border-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                          Editar Reseña
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-600/10 border border-pink-500/20 text-[11px] font-semibold text-pink-300">
                          <Scissors className="w-3 h-3 text-pink-400" />
                          {prof.specialty}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reseña Profesional Box */}
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        Reseña Profesional
                      </span>
                      <button
                        onClick={() => handleStartEdit(prof)}
                        className="text-[11px] text-pink-400 hover:underline font-semibold"
                      >
                        Modificar texto
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 italic">
                      "{prof.bio}"
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom stats & Quick link to agenda */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  <span>
                    Turnos hoy: <strong className="text-white">{todayAppointments.length}</strong>
                  </span>
                </div>

                {onNavigateToAgenda && (
                  <button
                    onClick={() => onNavigateToAgenda(prof.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-pink-400 hover:text-pink-300 transition"
                  >
                    Ver en agenda &rarr;
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
