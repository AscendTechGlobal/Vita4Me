import React, { useState } from 'react';
import { 
  Syringe, 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ShieldAlert, 
  Calendar, 
  Building 
} from 'lucide-react';
import { Vaccine, Allergy, Procedure } from '../types';

interface VaccinesAndAllergiesTabProps {
  vaccines: Vaccine[];
  allergies: Allergy[];
  procedures: Procedure[];
  onAddVaccine: (vax: Vaccine) => void;
  onAddAllergy: (alg: Allergy) => void;
}

export const VaccinesAndAllergiesTab: React.FC<VaccinesAndAllergiesTabProps> = ({
  vaccines,
  allergies,
  procedures,
  onAddVaccine,
  onAddAllergy
}) => {
  const [activeSubtab, setActiveSubtab] = useState<'vaccines' | 'allergies' | 'procedures'>('vaccines');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Imunização & Alertas Médicos</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Vacinação, Alergias & Cirurgias</h1>
          <p className="text-xs text-slate-300 mt-1">
            Consulte sua carteira de vacinas atualizada, reações alérgicas conhecidas para salvar vidas em emergências e histórico de procedimentos operatórios.
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubtab('vaccines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubtab === 'vaccines' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Vacinação ({vaccines.length})
          </button>
          <button
            onClick={() => setActiveSubtab('allergies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubtab === 'allergies' ? 'bg-red-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Alergias ({allergies.length})
          </button>
          <button
            onClick={() => setActiveSubtab('procedures')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubtab === 'procedures' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Cirurgias ({procedures.length})
          </button>
        </div>
      </div>

      {/* 1. Vaccines Subtab */}
      {activeSubtab === 'vaccines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Syringe className="w-5 h-5 text-amber-400" />
              <span>Carteira Digital de Vacinação</span>
            </h2>

            <button
              onClick={() => {
                const name = prompt("Nome da Vacina:", "Dengue (Qdenga)");
                if (name) {
                  onAddVaccine({
                    id: `vax-${Date.now()}`,
                    name,
                    doseInfo: 'Dose de Reforço',
                    dateAdministered: new Date().toISOString().split('T')[0],
                    status: 'Em dia',
                    location: 'Unidade de Saúde'
                  });
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30"
            >
              + Registrar Vacina
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaccines.map((vax) => (
              <div 
                key={vax.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  vax.status === 'Em dia'
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      vax.status === 'Em dia' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {vax.status}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{vax.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{vax.doseInfo}</p>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-amber-400 shrink-0">
                    <Syringe className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {vax.dateAdministered ? `Aplicada em: ${vax.dateAdministered}` : `Previsão: ${vax.dueDate}`}
                  </span>
                  {vax.location && <span className="truncate max-w-[150px]">{vax.location}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Allergies Subtab */}
      {activeSubtab === 'allergies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Registro de Alergias & Reações</span>
            </h2>

            <button
              onClick={() => {
                const allergen = prompt("Nome do Alérgeno (Remédio/Alimento):", "Penicilina");
                if (allergen) {
                  onAddAllergy({
                    id: `alg-${Date.now()}`,
                    allergen,
                    category: 'Medicamentosa',
                    severity: 'Grave',
                    reaction: 'Edema e erupção cutânea.'
                  });
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30"
            >
              + Registrar Alergia
            </button>
          </div>

          <div className="space-y-3">
            {allergies.map((alg) => (
              <div 
                key={alg.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{alg.allergen}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alg.severity === 'Grave' 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : alg.severity === 'Moderada' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      Severidade {alg.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {alg.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    <strong className="text-slate-400 font-medium">Sintomas/Reação: </strong>{alg.reaction}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Procedures & Surgeries Subtab */}
      {activeSubtab === 'procedures' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <span>Procedimentos & Cirurgias Realizadas</span>
          </h2>

          <div className="space-y-3">
            {procedures.map((proc) => (
              <div key={proc.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      {proc.type}
                    </span>
                    <h3 className="text-sm font-bold text-white">{proc.title}</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{proc.date}</span>
                </div>

                <p className="text-xs text-slate-400">
                  {proc.doctorName} • {proc.hospital}
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  <span className="font-bold text-emerald-400">Resultado: </span>
                  {proc.outcome}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
