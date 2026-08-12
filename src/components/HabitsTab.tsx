import React from 'react';
import { 
  Droplet, 
  Moon, 
  Smile, 
  Activity, 
  HeartPulse, 
  CheckCircle2, 
  Plus, 
  Minus,
  Scale
} from 'lucide-react';
import { DailyHabits } from '../types';

interface HabitsTabProps {
  dailyHabits: DailyHabits;
  onUpdateHabits: (updated: DailyHabits) => void;
}

export const HabitsTab: React.FC<HabitsTabProps> = ({
  dailyHabits,
  onUpdateHabits
}) => {
  const addWater = (ml: number) => {
    onUpdateHabits({
      ...dailyHabits,
      waterIntakeMl: Math.max(0, dailyHabits.waterIntakeMl + ml)
    });
  };

  const setSleep = (hours: number, quality: DailyHabits['sleepQuality']) => {
    onUpdateHabits({
      ...dailyHabits,
      sleepHours: hours,
      sleepQuality: quality
    });
  };

  const setMood = (mood: DailyHabits['mood']) => {
    onUpdateHabits({
      ...dailyHabits,
      mood
    });
  };

  const moods: DailyHabits['mood'][] = ['Ótimo', 'Bem', 'Neutro', 'Cansado', 'Estressado'];
  const sleepQualities: DailyHabits['sleepQuality'][] = ['Péssima', 'Regular', 'Boa', 'Excelente'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Cuidado Preventivo Diário</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Organização da Rotina de Bem-estar</h1>
          <p className="text-xs text-slate-300 mt-1">
            Pequenos hábitos diários exercem influência direta sobre a saúde ao longo dos anos. Registre água, sono, humor e atividade física.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Consumo Diário de Água */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <Droplet className="w-5 h-5 fill-blue-500/20" />
              <h2 className="text-base font-bold text-white">Consumo de Água</h2>
            </div>
            <span className="text-xs font-mono font-bold text-blue-300">
              {dailyHabits.waterIntakeMl} / {dailyHabits.waterGoalMl} ml
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (dailyHabits.waterIntakeMl / dailyHabits.waterGoalMl) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              onClick={() => addWater(-250)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={() => addWater(250)}
              className="flex-1 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> +250ml (Copo)
            </button>

            <button
              onClick={() => addWater(500)}
              className="flex-1 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> +500ml (Garrafa)
            </button>
          </div>
        </div>

        {/* 2. Sono & Descanso */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Moon className="w-5 h-5 fill-indigo-500/20" />
              <h2 className="text-base font-bold text-white">Sono e Descanso</h2>
            </div>
            <span className="text-xs font-bold text-indigo-300">{dailyHabits.sleepHours} Horas</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Qualidade do Sono:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {sleepQualities.map((q) => (
                <button
                  key={q}
                  onClick={() => setSleep(dailyHabits.sleepHours, q)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    dailyHabits.sleepQuality === q
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Humor & Estado Emocional */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Smile className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Humor do Dia</h2>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`py-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                  dailyHabits.mood === m
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Atividade Física & Peso */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-teal-400">
            <Activity className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Atividade Física & Peso</h2>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">{dailyHabits.activityType || 'Exercício'}</span>
              <span className="font-bold text-teal-400">{dailyHabits.physicalActivityMins} min</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400 flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Peso Atual</span>
              <span className="font-bold text-white">{dailyHabits.bodyWeightKg} kg</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
