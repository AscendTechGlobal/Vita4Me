import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Gauge,
  History
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  AreaChart,
  Area
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
  const [timeRange, setTimeRange] = useState<'all' | '6m' | '1y'>('all');
  const [chartStyle, setChartStyle] = useState<'line' | 'area'>('area');
  const [newValue, setNewValue] = useState<string>('');
  const [newValueSecondary, setNewValueSecondary] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState<string>('');

  const metricTypesInfo: Record<MetricType, { 
    label: string; 
    unit: string; 
    targetRange: string; 
    refVal: number; 
    color: string;
    description: string;
  }> = {
    colesterol_ldl: { 
      label: 'Colesterol LDL', 
      unit: 'mg/dL', 
      targetRange: '< 100 mg/dL (Ideal) / < 70 (Alto Risco)', 
      refVal: 100, 
      color: '#f59e0b',
      description: 'Fração de lipoproteína de baixa densidade responsável pelo transporte de colesterol.'
    },
    pressao_arterial: { 
      label: 'Pressão Arterial', 
      unit: 'mmHg', 
      targetRange: '120 / 80 mmHg (Ótima)', 
      refVal: 120, 
      color: '#10b981',
      description: 'Pressão Sistólica (máxima) e Diastólica (mínima) exercida pelo sangue nas artérias.'
    },
    glicemia: { 
      label: 'Glicemia em Jejum', 
      unit: 'mg/dL', 
      targetRange: '70 - 99 mg/dL (Normal)', 
      refVal: 99, 
      color: '#14b8a6',
      description: 'Concentração de glicose no sangue após período de jejum de 8 a 12 horas.'
    },
    peso: { 
      label: 'Peso Corporal', 
      unit: 'kg', 
      targetRange: '70 - 80 kg (Meta IMC normal)', 
      refVal: 78, 
      color: '#6366f1',
      description: 'Massa corporal total aferida para controle de composição física e metabólica.'
    },
    vitamina_d: { 
      label: 'Vitamina D (25-OH)', 
      unit: 'ng/mL', 
      targetRange: '30 - 60 ng/mL (Suficiente)', 
      refVal: 30, 
      color: '#eab308',
      description: 'Pró-hormônio essencial para a fixação de cálcio, saúde óssea e imunidade.'
    },
    colesterol_total: { 
      label: 'Colesterol Total', 
      unit: 'mg/dL', 
      targetRange: '< 190 mg/dL', 
      refVal: 190, 
      color: '#f97316',
      description: 'Soma total das frações de colesterol circulantes no sangue.'
    },
    colesterol_hdl: { 
      label: 'Colesterol HDL', 
      unit: 'mg/dL', 
      targetRange: '> 40 mg/dL (Desejável > 50)', 
      refVal: 40, 
      color: '#38bdf8',
      description: 'Colesterol bom que transporta lipídios das artérias de volta para o fígado.'
    },
    frequencia_cardiaca: { 
      label: 'Frequência Cardíaca', 
      unit: 'bpm', 
      targetRange: '60 - 100 bpm em repouso', 
      refVal: 72, 
      color: '#ec4899',
      description: 'Número de batimentos por minuto aferidos em repouso.'
    },
    ferritina: { 
      label: 'Ferritina', 
      unit: 'ng/mL', 
      targetRange: '30 - 400 ng/mL', 
      refVal: 150, 
      color: '#8b5cf6',
      description: 'Proteína que armazena ferro nos tecidos celulares.'
    },
    tsh: { 
      label: 'TSH Basal', 
      unit: 'mUI/L', 
      targetRange: '0.4 - 4.3 mUI/L', 
      refVal: 2.0, 
      color: '#06b6d4',
      description: 'Hormônio estimulador da tireoide produzido pela hipófise.'
    },
    hemoglobina: { 
      label: 'Hemoglobina', 
      unit: 'g/dL', 
      targetRange: '13.5 - 17.5 g/dL', 
      refVal: 15, 
      color: '#ef4444',
      description: 'Proteína dos glóbulos vermelhos responsável pelo transporte de oxigênio.'
    }
  };

  const currentInfo = metricTypesInfo[selectedType];

  // Filter metrics based on timeframe and sorted by date
  const filteredMetrics = useMemo(() => {
    let list = metrics
      .filter(m => m.type === selectedType)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (timeRange === '6m') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter(m => m.date >= cutoffStr);
    } else if (timeRange === '1y') {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter(m => m.date >= cutoffStr);
    }

    return list;
  }, [metrics, selectedType, timeRange]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredMetrics.map(m => ({
      date: m.date,
      displayDate: m.date.split('-').reverse().slice(0, 2).join('/'),
      Valor: m.value,
      Secundario: m.valueSecondary,
      notes: m.notes,
      unit: m.unit
    }));
  }, [filteredMetrics]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (filteredMetrics.length === 0) {
      return { latest: 0, latestSecondary: undefined, avg: 0, min: 0, max: 0, trend: 'stable', count: 0 };
    }
    const values = filteredMetrics.map(m => m.value);
    const latestEntry = filteredMetrics[filteredMetrics.length - 1];
    const latest = latestEntry.value;
    const latestSecondary = latestEntry.valueSecondary;
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (filteredMetrics.length >= 2) {
      const prev = filteredMetrics[filteredMetrics.length - 2].value;
      if (latest > prev) trend = 'up';
      else if (latest < prev) trend = 'down';
    }

    return { latest, latestSecondary, avg, min, max, trend, count: filteredMetrics.length };
  }, [filteredMetrics]);

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue) return;

    const newEntry: MetricEntry = {
      id: `m-${Date.now()}`,
      date: newDate || new Date().toISOString().split('T')[0],
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

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[160px]">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] border-b border-slate-800 pb-1">
            <span>{dataPoint.date}</span>
            <span className="text-emerald-400 font-semibold">{currentInfo.unit}</span>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-slate-300 font-medium">{selectedType === 'pressao_arterial' ? 'Sistólica:' : 'Valor:'}</span>
            <span className="text-sm font-bold text-white" style={{ color: currentInfo.color }}>
              {dataPoint.Valor} {currentInfo.unit}
            </span>
          </div>
          {dataPoint.Secundario !== undefined && (
            <div className="flex items-baseline justify-between">
              <span className="text-slate-400">Diastólica:</span>
              <span className="text-xs font-bold text-sky-400">
                {dataPoint.Secundario} {currentInfo.unit}
              </span>
            </div>
          )}
          {dataPoint.notes && (
            <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/80">
              "{dataPoint.notes}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Acompanhamento Longitudinal Inteligente</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Evolução Histórica de Indicadores</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Gráficos interativos para acompanhar tendências de exames e medições clínicas ao longo dos anos, com parâmetros de referência médica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold text-white">{metrics.length}</span> medições no total
          </div>
        </div>
      </div>

      {/* Indicator Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {(Object.keys(metricTypesInfo) as MetricType[]).map(type => {
          const info = metricTypesInfo[type];
          const isSelected = selectedType === type;
          const count = metrics.filter(m => m.type === type).length;

          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border border-slate-800'
              }`}
            >
              <span>{info.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Última Medição */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Último Registro</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">
              {stats.count > 0 ? (
                selectedType === 'pressao_arterial' 
                  ? `${stats.latest}/${stats.latestSecondary}` 
                  : stats.latest
              ) : '--'}
            </span>
            <span className="text-xs text-slate-400">{currentInfo.unit}</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {stats.count > 0 ? filteredMetrics[filteredMetrics.length - 1]?.date : 'Sem registro'}
          </p>
        </div>

        {/* Média Histórica */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Média do Período</span>
            <Activity className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">
              {stats.count > 0 ? stats.avg.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-400">{currentInfo.unit}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Base: {stats.count} aferições
          </p>
        </div>

        {/* Mínimo e Máximo */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Faixa Registrada</span>
            <History className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {stats.count > 0 ? (
              <span className="font-mono">{stats.min} ~ {stats.max} <span className="text-xs font-normal text-slate-400">{currentInfo.unit}</span></span>
            ) : '--'}
          </div>
          <p className="text-[11px] text-slate-500">
            Variação observada
          </p>
        </div>

        {/* Tendência / Alvo */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tendência Recente</span>
            {stats.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />}
            {stats.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />}
            {stats.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold mt-1">
            {stats.trend === 'up' && <span className="text-amber-400">Em Elevação</span>}
            {stats.trend === 'down' && <span className="text-emerald-400">Em Redução</span>}
            {stats.trend === 'stable' && <span className="text-slate-300">Estável</span>}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            Meta: {currentInfo.refVal} {currentInfo.unit}
          </p>
        </div>

      </div>

      {/* Main Interactive Recharts Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{currentInfo.label}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                {currentInfo.unit}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {currentInfo.description}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Faixa de Referência Recomendada: <span className="text-emerald-400 font-semibold">{currentInfo.targetRange}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Chart Style Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setChartStyle('area')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  chartStyle === 'area' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Área Suave
              </button>
              <button
                onClick={() => setChartStyle('line')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  chartStyle === 'line' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Linha
              </button>
            </div>

            {/* Timeframe Filter */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  timeRange === 'all' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setTimeRange('1y')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  timeRange === '1y' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1 Ano
              </button>
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  timeRange === '6m' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                6 Meses
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Component */}
        <div className="h-80 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 25, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentInfo.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentInfo.color} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="bpSecGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={currentInfo.refVal} 
                    stroke="#10b981" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Ref: ${currentInfo.refVal}`, 
                      fill: '#10b981', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Valor" 
                    stroke={currentInfo.color} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#metricGradient)" 
                    dot={{ r: 5, fill: currentInfo.color, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  {selectedType === 'pressao_arterial' && (
                    <Area 
                      type="monotone" 
                      dataKey="Secundario" 
                      stroke="#38bdf8" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#bpSecGradient)" 
                      dot={{ r: 4, fill: '#38bdf8' }} 
                    />
                  )}
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 25, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={currentInfo.refVal} 
                    stroke="#10b981" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Ref: ${currentInfo.refVal}`, 
                      fill: '#10b981', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
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
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <Activity className="w-8 h-8 text-slate-600" />
              <p>Nenhuma medição encontrada para este indicador no período selecionado.</p>
            </div>
          )}
        </div>

        {/* Add Measurement Form */}
        <form onSubmit={handleAddMeasurement} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Registrar Nova Medição para {currentInfo.label}</span>
            </h3>
            <span className="text-[11px] text-slate-400">Unidade: {currentInfo.unit}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Data da Aferição
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {selectedType === 'pressao_arterial' ? 'Sistólica (mmHg)' : `Valor (${currentInfo.unit})`}
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

            {selectedType === 'pressao_arterial' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Diastólica (mmHg)
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
            ) : null}

            <div className={selectedType === 'pressao_arterial' ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Anotação / Contexto Clínico
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Ex: Em jejum / Laboratório Fleury"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Salvar Medição no Histórico
            </button>
          </div>
        </form>

      </div>

    </div>
  );
};

