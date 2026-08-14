import React from 'react';
import { Pill, Check, Clock, X, BellRing, Volume2 } from 'lucide-react';
import { Medication } from '../types';

interface MedicationNotificationToastProps {
  medication: Medication;
  time: string;
  onMarkAsTaken: () => void;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

export const MedicationNotificationToast: React.FC<MedicationNotificationToastProps> = ({
  medication,
  time,
  onMarkAsTaken,
  onSnooze,
  onDismiss,
}) => {
  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-md">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Lembrete de Medicamento
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {time}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {medication.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Medication Details */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Dosagem:</span>
            <span className="font-semibold text-slate-200">{medication.dosage}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Frequência:</span>
            <span className="text-slate-300">{medication.frequency}</span>
          </div>
          {medication.instructions && (
            <p className="text-[11px] text-emerald-300/90 pt-1 border-t border-slate-800/80 italic">
              💡 {medication.instructions}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAsTaken}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Já tomei a dose</span>
          </button>

          <button
            onClick={() => onSnooze(10)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Adiar 10m</span>
          </button>
        </div>

      </div>
    </div>
  );
};
