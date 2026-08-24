import React, { useState } from "react";
import { 
  Calendar, 
  Plus, 
  Stethoscope, 
  Syringe, 
  AlertTriangle, 
  Hospital, 
  Activity, 
  ArrowLeft,
  Trash2
} from "lucide-react";
import { HealthRecord, RecordType, FamilyMember } from "../types";
import { saveHealthRecord, deleteHealthRecord } from "../lib/healthStorage";

interface TimelineViewProps {
  records: HealthRecord[];
  activeMember: FamilyMember | null;
  onRefreshRecords: () => void;
  onBack: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  records,
  activeMember,
  onRefreshRecords,
  onBack,
}) => {
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("consulta");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorOrInstitution, setDoctorOrInstitution] = useState("");
  const [description, setDescription] = useState("");

  const filteredRecords = records
    .filter(r => selectedType === "todos" || r.record_type === selectedType)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  const getRecordIcon = (type: RecordType) => {
    switch (type) {
      case 'consulta': return <Stethoscope className="w-4 h-4 text-blue-400" />;
      case 'vacina': return <Syringe className="w-4 h-4 text-emerald-400" />;
      case 'alergia': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'cirurgia':
      case 'internacao': return <Hospital className="w-4 h-4 text-amber-400" />;
      default: return <Activity className="w-4 h-4 text-teal-400" />;
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newRecord: HealthRecord = {
      id: "rec-" + Date.now(),
      user_id: "usr-default",
      family_member_id: activeMember?.id || null,
      record_type: recordType,
      title: title.trim(),
      description: description.trim() || undefined,
      doctor_or_institution: doctorOrInstitution.trim() || undefined,
      event_date: eventDate,
      tags: [recordType.toUpperCase()],
      created_at: new Date().toISOString(),
    };

    saveHealthRecord(newRecord);
    onRefreshRecords();
    setShowAddModal(false);

    // Reset Form
    setTitle("");
    setDescription("");
    setDoctorOrInstitution("");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Voltar ao Dashboard</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Linha do Tempo Médica Contínua</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Histórico cronológico de consultas, vacinas, cirurgias e procedimentos de {activeMember?.name || 'você'}.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Evento Clínico</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['todos', 'consulta', 'vacina', 'cirurgia', 'internacao', 'alergia'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition cursor-pointer ${
              selectedType === type
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            }`}
          >
            {type === 'todos' ? 'Todos os Eventos' : type}
          </button>
        ))}
      </div>

      {/* Timeline Events List */}
      <div className="space-y-4">
        {filteredRecords.map((rec) => (
          <div
            key={rec.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl space-y-3 shadow-xs transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {getRecordIcon(rec.record_type)}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    {rec.record_type}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{rec.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{rec.event_date}</span>
                <button
                  onClick={() => {
                    if (window.confirm("Remover evento do histórico?")) {
                      deleteHealthRecord(rec.id);
                      onRefreshRecords();
                    }
                  }}
                  className="p-1 hover:text-rose-500 transition"
                  title="Excluir evento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {rec.doctor_or_institution && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Local / Médico:</strong> {rec.doctor_or_institution}
              </div>
            )}

            {rec.description && (
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {rec.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cadastrar Evento Médico</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consulta Cardiológica, Vacina da Gripe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipo de Registro</label>
                  <select
                    value={recordType}
                    onChange={(e: any) => setRecordType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="consulta">Consulta</option>
                    <option value="vacina">Vacina</option>
                    <option value="cirurgia">Cirurgia</option>
                    <option value="internacao">Internação</option>
                    <option value="alergia">Alergia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Data</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Médico ou Clínica</label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Marcelo (Hospital Sírio-Libanês)"
                  value={doctorOrInstitution}
                  onChange={(e) => setDoctorOrInstitution(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Observações e Orientações</label>
                <textarea
                  rows={3}
                  placeholder="Orientações médicas, prescrições recebidas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
