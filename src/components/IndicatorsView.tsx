import React, { useState } from "react";
import { 
  Activity, 
  TrendingUp, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Heart,
  Droplet
} from "lucide-react";
import { HealthIndicator, FamilyMember } from "../types";
import { saveIndicator, deleteIndicator } from "../lib/healthStorage";
import { trackEvent } from "../lib/analytics";

interface IndicatorsViewProps {
  indicators: HealthIndicator[];
  activeMember: FamilyMember | null;
  onRefreshIndicators: () => void;
  onBack: () => void;
}

export const IndicatorsView: React.FC<IndicatorsViewProps> = ({
  indicators,
  activeMember,
  onRefreshIndicators,
  onBack,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string>("Glicemia");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState("Glicemia");
  const [value, setValue] = useState<number>(90);
  const [unit, setUnit] = useState("mg/dL");
  const [category, setCategory] = useState<HealthIndicator["category"]>("Metabólico");
  const [refMin, setRefMin] = useState<number>(70);
  const [refMax, setRefMax] = useState<number>(99);

  const markerOptions = [
    { name: "Glicemia", unit: "mg/dL", category: "Metabólico", min: 70, max: 99 },
    { name: "Colesterol Total", unit: "mg/dL", category: "Lipídico", min: 120, max: 190 },
    { name: "Vitamina D", unit: "ng/mL", category: "Vitaminas", min: 30, max: 60 },
    { name: "Pressão Sistólica", unit: "mmHg", category: "Vital", min: 90, max: 129 },
    { name: "Pressão Diastólica", unit: "mmHg", category: "Vital", min: 60, max: 84 },
    { name: "Peso", unit: "kg", category: "Vital", min: 50, max: 100 },
  ];

  const markerData = indicators
    .filter(i => i.name === selectedMarker)
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());

  const latestVal = markerData[markerData.length - 1];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opt = markerOptions.find(o => o.name === name);

    let status: HealthIndicator["status"] = "normal";
    if (opt) {
      if (value < opt.min) status = "low";
      else if (value > opt.max) status = "high";
    }

    const newInd: HealthIndicator = {
      id: "ind-" + Date.now(),
      user_id: "usr-default",
      family_member_id: activeMember?.id || null,
      name,
      category: (opt?.category as any) || "Metabólico",
      value: Number(value),
      unit: opt?.unit || unit,
      reference_min: opt?.min || refMin,
      reference_max: opt?.max || refMax,
      measured_at: new Date().toISOString(),
      status,
      created_at: new Date().toISOString(),
    };

    saveIndicator(newInd);
    trackEvent('health_indicator_created', { category: newInd.category });
    onRefreshIndicators();
    setShowAddModal(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Return Button */}
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
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Painel de Indicadores Clínicos & Evolução</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Monitore suas curvas laboratoriais, pressão arterial e taxas ao longo dos meses e anos.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nova Medição</span>
        </button>
      </div>

      {/* Indicator Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {markerOptions.map((opt) => {
          const isSelected = selectedMarker === opt.name;
          return (
            <button
              key={opt.name}
              onClick={() => setSelectedMarker(opt.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>{opt.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Evolution Chart Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Evolução Temporal &bull; {selectedMarker}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {latestVal ? latestVal.value : '—'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {latestVal ? latestVal.unit : (markerOptions.find(o => o.name === selectedMarker)?.unit || '')}
              </span>
            </div>
          </div>

          <div className="text-right text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Faixa de Referência Ideal:</span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              {latestVal ? `${latestVal.reference_min} - ${latestVal.reference_max} ${latestVal.unit}` : (
                (() => {
                  const opt = markerOptions.find(o => o.name === selectedMarker);
                  return opt ? `${opt.min} - ${opt.max} ${opt.unit}` : 'Definido no laudo';
                })()
              )}
            </strong>
          </div>
        </div>

        {/* Visual Trend Chart */}
        <div className="h-64 flex items-end gap-6 pt-8 px-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          {markerData.length > 0 ? (
            markerData.map((d, idx) => {
              const maxScale = (d.reference_max || 100) * 1.3;
              const heightPercent = Math.min(Math.round((d.value / maxScale) * 100), 100);
              const isNormal = d.value <= (d.reference_max || 100) && d.value >= (d.reference_min || 0);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition text-[11px] font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    {d.value} {d.unit}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 ${
                      isNormal
                        ? "bg-emerald-600 dark:bg-emerald-500 group-hover:brightness-110"
                        : "bg-amber-500 dark:bg-amber-400 group-hover:brightness-110"
                    }`}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(d.measured_at).toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center text-slate-400 text-xs py-20">
              Nenhuma medição registrada para {selectedMarker} ainda.
            </div>
          )}
        </div>

        {/* Measurement History Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Histórico de Coletas</h3>
          {markerData.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
              {markerData.map((d) => (
                <div key={d.id} className="p-3.5 bg-white dark:bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(d.measured_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {d.value} {d.unit}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    d.status === 'normal'
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}>
                    {d.status === 'normal' ? 'Normal' : 'Atenção'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              Sem coletas salvas para este marcador. Clique em "Registrar Nova Medição" para adicionar.
            </div>
          )}
        </div>
      </div>

      {/* Add Indicator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Registrar Nova Medição</h2>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Indicador</label>
                <select
                  value={name}
                  onChange={(e) => {
                    const selected = markerOptions.find(m => m.name === e.target.value);
                    setName(e.target.value);
                    if (selected) {
                      setUnit(selected.unit);
                      setCategory(selected.category as any);
                      setRefMin(selected.min);
                      setRefMax(selected.max);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {markerOptions.map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Medido ({unit})</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Salvar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
