import React, { useState } from "react";
import { 
  Pill, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Trash2,
  Calendar
} from "lucide-react";
import { Medication, FamilyMember } from "../types";
import { saveMedication, deleteMedication } from "../lib/healthStorage";
import { trackEvent } from "../lib/analytics";

interface MedicationsViewProps {
  medications: Medication[];
  activeMember: FamilyMember | null;
  onRefreshMedications: () => void;
  onBack: () => void;
}

export const MedicationsView: React.FC<MedicationsViewProps> = ({
  medications,
  activeMember,
  onRefreshMedications,
  onBack,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("1x ao dia (a cada 24h)");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [instructions, setInstructions] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [isContinuous, setIsContinuous] = useState(true);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    const newMed: Medication = {
      id: "med-" + Date.now(),
      user_id: "usr-default",
      family_member_id: activeMember?.id || null,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      schedule_times: [scheduleTime],
      instructions: instructions.trim() || undefined,
      prescribed_by: prescribedBy.trim() || undefined,
      is_continuous: isContinuous,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    saveMedication(newMed);
    trackEvent('medication_created');
    onRefreshMedications();
    setShowAddModal(false);

    // Reset
    setName("");
    setDosage("");
    setInstructions("");
    setPrescribedBy("");
  };

  const handleToggleActive = (med: Medication) => {
    saveMedication({ ...med, is_active: !med.is_active });
    onRefreshMedications();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Return Button */}
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
            <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Medicamentos & Lembretes de Posologia</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Controle de remédios de uso contínuo e tratamentos pontuais com alertas de horário para {activeMember?.name || 'você'}.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Medicamento</span>
        </button>
      </div>

      {/* Medications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {medications.map((med) => (
          <div
            key={med.id}
            className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-xs transition flex flex-col justify-between ${
              med.is_active ? "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50" : "border-slate-200 dark:border-slate-800/40 opacity-60"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {med.is_continuous ? "USO CONTÍNUO" : "TRATAMENTO"}
                </span>

                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {med.schedule_times[0] || "08:00"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{med.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.dosage} &bull; {med.frequency}</p>
              </div>

              {med.instructions && (
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                  <strong>Instruções:</strong> {med.instructions}
                </p>
              )}

              {med.prescribed_by && (
                <div className="text-[11px] text-slate-500">
                  Prescrito por: <span className="text-slate-700 dark:text-slate-300">{med.prescribed_by}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleToggleActive(med)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  med.is_active
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{med.is_active ? "Em Uso" : "Pausado"}</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Deseja remover este medicamento?")) {
                    deleteMedication(med.id);
                    onRefreshMedications();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {medications.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
            <Pill className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum medicamento cadastrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Cadastre suas receitas e remédios contínuos com dosagem e horários para acompanhamento.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar medicamento</span>
          </button>
        </div>
      )}

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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Novo Medicamento</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nome do Medicamento *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Losartana 50mg, Vitamina C..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Dosagem</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="Ex: 50mg, 1 cp"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Horário Principal</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Frequência</label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="Ex: 1x ao dia pela manhã, de 8 em 8 horas"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Instruções / Como Tomar</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex: Tomar em jejum com água"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Médico Prescritor</label>
                <input
                  type="text"
                  value={prescribedBy}
                  onChange={(e) => setPrescribedBy(e.target.value)}
                  placeholder="Ex: Dr. Eduardo"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="continuousCheck"
                  checked={isContinuous}
                  onChange={(e) => setIsContinuous(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="continuousCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Medicamento de uso contínuo
                </label>
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
                  Salvar Medicamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
