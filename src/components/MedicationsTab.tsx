import React, { useState } from 'react';
import { 
  Pill, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  Info 
} from 'lucide-react';
import { Medication } from '../types';

interface MedicationsTabProps {
  medications: Medication[];
  onAddMedication: (newMed: Medication) => void;
  onToggleActive: (medId: string) => void;
}

export const MedicationsTab: React.FC<MedicationsTabProps> = ({
  medications,
  onAddMedication,
  onToggleActive
}) => {
  const [checkedDoses, setCheckedDoses] = useState<Record<string, boolean>>({
    'med-01-08:00': true
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Diária');
  const [timeStr, setTimeStr] = useState('08:00');
  const [purpose, setPurpose] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const activeMeds = medications.filter(m => m.active);
  const pastMeds = medications.filter(m => !m.active);

  const toggleCheckDose = (key: string) => {
    setCheckedDoses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name,
      dosage,
      frequency,
      timesOfDay: [timeStr],
      startDate: new Date().toISOString().split('T')[0],
      instructions: 'Tomar com água conforme prescrição médica.',
      active: true,
      prescribedBy: prescribedBy || 'Médico Assistente',
      purpose: purpose || 'Tratamento de Saúde'
    };

    onAddMedication(newMed);
    setName('');
    setDosage('');
    setPurpose('');
    setPrescribedBy('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Pill className="w-4 h-4" />
            <span>Adesão ao Tratamento</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Medicamentos & Lembretes Diários</h1>
          <p className="text-xs text-slate-300 mt-1">
            Acompanhe horários de tomadas, dosagens, receitas associadas e lembretes para manter a continuidade do seu tratamento com segurança.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shrink-0 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar Medicamento</span>
        </button>
      </div>

      {/* Add Medication Drawer Form */}
      {showAddForm && (
        <form onSubmit={handleAddMed} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Cadastrar Novo Medicamento
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Medicamento</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Losartana Potássica"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Dosagem</label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Ex: 50mg / 1 comprimido"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Horário Principal</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Frequência</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="Ex: Diária / De 12 em 12 horas"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Finalidade / Objetivo</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex: Controle de pressão arterial"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Médico Prescritor</label>
              <input
                type="text"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                placeholder="Ex: Dr. Roberto Mendonça"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Salvar Medicamento
            </button>
          </div>
        </form>
      )}

      {/* Schedule Today Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Lembretes & Tomadas de Hoje</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="space-y-3">
          {activeMeds.map((med) => {
            return med.timesOfDay.map((time) => {
              const doseKey = `${med.id}-${time}`;
              const isTaken = checkedDoses[doseKey];

              return (
                <div 
                  key={doseKey}
                  onClick={() => toggleCheckDose(doseKey)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    isTaken 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isTaken ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isTaken ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isTaken ? 'line-through opacity-80' : 'text-white'}`}>
                          {med.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {med.dosage}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {med.instructions} • {med.purpose}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{time}</span>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Past Medications History */}
      {pastMeds.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Histórico de Medicamentos Encerrados
          </h2>

          <div className="space-y-2">
            {pastMeds.map((med) => (
              <div key={med.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 opacity-75">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">{med.name} ({med.dosage})</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Concluído</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Início: {med.startDate} {med.endDate ? `• Término: ${med.endDate}` : ''} • Prescrito por: {med.prescribedBy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
