import React, { useState } from "react";
import { 
  Droplet, 
  Moon, 
  Flame, 
  Smile, 
  ArrowLeft, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Calendar
} from "lucide-react";
import { DailyHabit } from "../types";
import { saveDailyHabit } from "../lib/healthStorage";

interface HabitsViewProps {
  todayHabit: DailyHabit;
  onRefreshHabit: () => void;
  onBack: () => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  todayHabit,
  onRefreshHabit,
  onBack,
}) => {
  const [waterMl, setWaterMl] = useState(todayHabit.water_ml);
  const [sleepHours, setSleepHours] = useState(todayHabit.sleep_hours);
  const [exerciseMinutes, setExerciseMinutes] = useState(todayHabit.exercise_minutes);
  const [mood, setMood] = useState<DailyHabit["mood"]>(todayHabit.mood || "Excelente");
  const [notes, setNotes] = useState(todayHabit.notes || "");

  const waterGoal = 2500;
  const waterPercent = Math.min(Math.round((waterMl / waterGoal) * 100), 100);

  const handleAddWater = (amount: number) => {
    const updated = Math.max(0, waterMl + amount);
    setWaterMl(updated);
    saveDailyHabit({ water_ml: updated });
    onRefreshHabit();
  };

  const handleSaveAll = () => {
    saveDailyHabit({
      water_ml: waterMl,
      sleep_hours: sleepHours,
      exercise_minutes: exerciseMinutes,
      mood,
      notes,
    });
    onRefreshHabit();
    alert("Rotina diária salva com sucesso!");
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
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
            <Droplet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Rotina Diária & Hábitos de Bem-estar</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Acompanhe sua hidratação, qualidade do sono, atividade física e humor diário.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Salvar Rotina de Hoje</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Water Intake Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Meta de Hidratação</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Meta: {waterGoal} ml / dia</span>
              </div>
            </div>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{waterMl} ml</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                style={{ width: `${waterPercent}%` }}
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{waterPercent}% atingido</span>
              <span>Faltam {Math.max(0, waterGoal - waterMl)} ml</span>
            </div>
          </div>

          {/* Water quick add buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => handleAddWater(250)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>+250 ml (Copo)</span>
            </button>
            <button
              onClick={() => handleAddWater(500)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>+500 ml (Garrafa)</span>
            </button>
            <button
              onClick={() => handleAddWater(-250)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>-250 ml</span>
            </button>
          </div>
        </div>

        {/* Sleep Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Horas de Sono</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Descanso noturno</span>
              </div>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{sleepHours}h</span>
          </div>

          <input
            type="range"
            min="3"
            max="12"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>3 horas</span>
            <span>Meta: 8 horas</span>
            <span>12 horas</span>
          </div>
        </div>

        {/* Exercise Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Atividade Física</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Treinos e caminhadas</span>
              </div>
            </div>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{exerciseMinutes} min</span>
          </div>

          <div className="flex items-center gap-2">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => setExerciseMinutes(mins)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  exerciseMinutes === mins
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Mood & Notes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Humor & Disposição</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Como você se sentiu hoje?</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["Excelente", "Bom", "Neutro", "Cansado", "Estressado"].map((m: any) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`flex-1 py-2 px-2 text-[11px] font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                  mood === m
                    ? "bg-emerald-600 text-white font-black shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações sobre sintomas, disposição ou dieta..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
