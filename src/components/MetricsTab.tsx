import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { MetricEntry, MetricType } from '../types';

interface MetricsTabProps {
  metrics: MetricEntry[];
  onAddMetric: (newMetric: MetricEntry) => void;
}

export const MetricsTab: React.FC<MetricsTabProps> = ({
  metrics,
  onAddMetric
}) => {
  const [selectedType, setSelectedType] = useState<MetricType>('colesterol_ldl');
  const [newValue, setNewValue] = useState<string>('');
  const [newValueSecondary, setNewValueSecondary] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const metricTypesInfo: Record<MetricType, { label: string; unit: string; targetRange: string; refVal: number; color: string }> = {
    colesterol_ldl: { label: 'Colesterol LDL', unit: 'mg/dL', targetRange: '< 100 mg/dL', refVal: 100, color: '#f59e0b' },
    pressao_arterial: { label: 'Pressão Arterial', unit: 'mmHg', targetRange: '120 / 80 mmHg', refVal: 120, color: '#10b981' },
    glicemia: { label: 'Glicemia em Jejum', unit: 'mg/dL', targetRange: '70 - 99 mg/dL', refVal: 99, color: '#14b8a6' },
    peso: { label: 'Peso Corporal', unit: 'kg', targetRange: '70 - 80 kg', refVal: 78, color: '#6366f1' },
    vitamina_d: { label: 'Vitamina D (25-OH)', unit: 'ng/mL', targetRange: '30 - 60 ng/mL', refVal: 30, color: '#f59e0b' },
    colesterol_total: { label: 'Colesterol Total', unit: 'mg/dL', targetRange: '< 190 mg/dL', refVal: 190, color: '#eab308' },
    colesterol_hdl: { label: 'Colesterol HDL', unit: 'mg/dL', targetRange: '> 40 mg/dL', refVal: 40, color: '#10b981' },
    frequencia_cardiaca: { label: 'Frequência Cardíaca', unit: 'bpm', targetRange: '60 - 100 bpm', refVal: 70, color: '#ec4899' },
    ferritina: { label: 'Ferritina', unit: 'ng/mL', targetRange: '30 - 400 ng/mL', refVal: 150, color: '#8b5cf6' },
    tsh: { label: 'TSH Basal', unit: 'mUI/L', targetRange: '0.4 - 4.3 mUI/L', refVal: 2.0, color: '#06b6d4' },
    hemoglobina: { label: 'Hemoglobina', unit: 'g/dL', targetRange: '13.5 - 17.5 g/dL', refVal: 15, color: '#ef4444' }
  };

  const currentInfo = metricTypesInfo[selectedType];

  // Filter metrics for chart
  const chartData = metrics
    .filter(m => m.type === selectedType)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({
      date: m.date,
      Valor: m.value,
      Secundario: m.valueSecondary,
      notes: m.notes
    }));

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;

    const newEntry: MetricEntry = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: selectedType,
      value: parseFloat(newValue),
      valueSecondary: newValueSecondary ? parseFloat(newValueSecondary) : undefined,
      unit: currentInfo.unit,
      notes: newNotes || undefined
    };

    onAddMetric(newEntry);
    setNewValue('');
    setNewValueSecondary('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Acompanhamento Longitudinal</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard de Indicadores de Saúde</h1>
          <p className="text-xs text-slate-300 mt-1">
            Visualize a evolução dos seus parâmetros laboratoriais e físicos ao longo do tempo sem a necessidade de analisar dezenas de laudos isolados.
          </p>
        </div>
      </div>

      {/* Indicator Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(Object.keys(metricTypesInfo) as MetricType[]).map(type => {
          const info = metricTypesInfo[type];
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{currentInfo.label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Intervalo Recomendado / Meta: <span className="text-emerald-400 font-semibold">{currentInfo.targetRange}</span>
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>{chartData.length} afeiçõ(es) registrada(s)</span>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-72 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <ReferenceLine y={currentInfo.refVal} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Meta: ${currentInfo.refVal}`, fill: '#10b981', fontSize: 10, position: 'right' }} />
                <Line 
                  type="monotone" 
                  dataKey="Valor" 
                  stroke={currentInfo.color} 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: currentInfo.color, strokeWidth: 2, stroke: '#0f172a' }} 
                  activeDot={{ r: 7 }}
                />
                {selectedType === 'pressao_arterial' && (
                  <Line 
                    type="monotone" 
                    dataKey="Secundario" 
                    stroke="#38bdf8" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#38bdf8' }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Nenhuma medição registrada ainda para {currentInfo.label}. Registre abaixo!
            </div>
          )}
        </div>

        {/* Add Measurement Form */}
        <form onSubmit={handleAddMeasurement} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Registrar Nova Medição para {currentInfo.label}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Valor ({currentInfo.unit})
              </label>
              <input
                type="number"
                step="any"
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Ex: ${currentInfo.refVal}`}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {selectedType === 'pressao_arterial' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Pressão Diastólica (mmHg)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newValueSecondary}
                  onChange={(e) => setNewValueSecondary(e.target.value)}
                  placeholder="Ex: 80"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className={selectedType === 'pressao_arterial' ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Anotação / Contexto
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Ex: Aferido em jejum / Pós-treino"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Salvar Medição
          </button>
        </form>

      </div>

    </div>
  );
};
