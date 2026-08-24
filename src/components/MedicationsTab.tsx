import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  Info,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Timer,
  Check,
  History,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-react';
import { Medication } from '../types';
import {
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  isSoundEnabled,
  setSoundEnabled,
  triggerTestNotification,
  calculateNextDose,
  getAlertHistory,
  isNotificationSupported,
  NotificationPermissionState,
  NextDoseInfo,
  MedicationAlertLog
} from '../utils/notificationManager';

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

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('default');
  const [notificationsOn, setNotificationsOn] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [nextDose, setNextDose] = useState<NextDoseInfo | null>(null);
  const [alertHistory, setAlertHistory] = useState<MedicationAlertLog[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Diária');
  const [timeStr, setTimeStr] = useState('08:00');
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);
  const [customTimeInput, setCustomTimeInput] = useState('14:00');
  const [purpose, setPurpose] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [instructions, setInstructions] = useState('Tomar com água conforme prescrição médica.');

  // Refresh status on load and periodically
  useEffect(() => {
    setPermissionState(getNotificationPermission());
    setNotificationsOn(areNotificationsEnabled());
    setSoundOn(isSoundEnabled());
    setNextDose(calculateNextDose(medications));
    setAlertHistory(getAlertHistory());

    const interval = setInterval(() => {
      setNextDose(calculateNextDose(medications));
      setAlertHistory(getAlertHistory());
    }, 15000);

    return () => clearInterval(interval);
  }, [medications]);

  const activeMeds = medications.filter(m => m.active);
  const pastMeds = medications.filter(m => !m.active);

  const totalDosesToday = activeMeds.reduce((acc, m) => acc + m.timesOfDay.length, 0);
  const takenDosesToday = Object.entries(checkedDoses).filter(([key, val]) => {
    return val && activeMeds.some(m => key.startsWith(m.id));
  }).length;
  const adherenceRate = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 100;

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
    if (result === 'granted') {
      setNotificationsOn(true);
      setTestFeedback('✅ Permissão concedida! Notificações do navegador agora estão ativas.');
      setTimeout(() => setTestFeedback(null), 5000);
    } else if (result === 'denied') {
      setTestFeedback('⚠️ Permissão negada pelo navegador. Você pode habilitar nas configurações de site do navegador.');
      setTimeout(() => setTestFeedback(null), 6000);
    }
  };

  const handleToggleGlobalNotifications = () => {
    const nextVal = !notificationsOn;
    setNotificationsOn(nextVal);
    setNotificationsEnabled(nextVal);
  };

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
  };

  const handleRunTestAlert = (med?: Medication) => {
    const success = triggerTestNotification(med);
    setAlertHistory(getAlertHistory());
    if (permissionState === 'granted') {
      setTestFeedback(`🔔 Alerta disparado com sucesso no navegador e som emitido!`);
    } else {
      setTestFeedback(`🔔 Som emitido! Ative as permissões acima para ver a notificação flutuante do sistema operacional.`);
    }
    setTimeout(() => setTestFeedback(null), 5000);
  };

  const toggleCheckDose = (key: string) => {
    setCheckedDoses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddCustomTime = () => {
    if (customTimeInput && !additionalTimes.includes(customTimeInput) && customTimeInput !== timeStr) {
      setAdditionalTimes([...additionalTimes, customTimeInput]);
    }
  };

  const handleRemoveCustomTime = (t: string) => {
    setAdditionalTimes(additionalTimes.filter(item => item !== t));
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    const allTimes = Array.from(new Set([timeStr, ...additionalTimes])).sort();

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name,
      dosage,
      frequency,
      timesOfDay: allTimes,
      startDate: new Date().toISOString().split('T')[0],
      instructions: instructions || 'Tomar com água conforme prescrição médica.',
      active: true,
      prescribedBy: prescribedBy || 'Médico Assistente',
      purpose: purpose || 'Tratamento de Saúde'
    };

    onAddMedication(newMed);
    setName('');
    setDosage('');
    setPurpose('');
    setPrescribedBy('');
    setInstructions('Tomar com água conforme prescrição médica.');
    setAdditionalTimes([]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Pill className="w-4 h-4" />
            <span>Adesão ao Tratamento & Farmacologia</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Medicamentos & Lembretes com Web Notifications</h1>
          <p className="text-xs text-slate-300 mt-1">
            Receba notificações automáticas no navegador nos horários exatos de cada dose com alertas sonoros e registro de adesão clínica.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Histórico ({alertHistory.length})</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Medicamento</span>
          </button>
        </div>
      </div>

      {/* Test Feedback Toast Bar */}
      {testFeedback && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{testFeedback}</span>
          </div>
          <button
            onClick={() => setTestFeedback(null)}
            className="text-xs text-teal-300/80 hover:text-white underline"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Web Notifications Center Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              permissionState === 'granted'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : permissionState === 'denied'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
            }`}>
              {permissionState === 'granted' ? (
                <BellRing className="w-5 h-5" />
              ) : permissionState === 'denied' ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Central de Notificações no Navegador</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  permissionState === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : permissionState === 'denied'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}>
                  {permissionState === 'granted' 
                    ? '● Notificações Ativas' 
                    : permissionState === 'denied' 
                    ? '● Bloqueado pelo Navegador' 
                    : '● Permissão Pendente'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                API Web Notifications & Web Audio Synthesizer integrados para monitorar seus horários em segundo plano.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {permissionState !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Permitir Notificações</span>
              </button>
            )}

            <button
              onClick={() => handleRunTestAlert()}
              className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/20 transition-colors flex items-center gap-1.5"
              title="Dispara uma notificação e som de teste imediatamente"
            >
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>Testar Alerta Agora</span>
            </button>

            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                soundOn
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title={soundOn ? 'Alerta Sonoro Ativo (Clique para mutar)' : 'Alerta Sonoro Mutado (Clique para ativar)'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleGlobalNotifications}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                notificationsOn
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
              title="Ligar ou pausar lembretes agendados"
            >
              {notificationsOn ? 'Lembretes Ligados' : 'Lembretes Pausados'}
            </button>
          </div>
        </div>

        {/* Dashboard Grid inside Center */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          
          {/* Next Scheduled Dose Highlight */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Timer className="w-3.5 h-3.5 text-emerald-400" /> Próxima Dose
              </span>
              <span className="font-mono text-[11px] text-emerald-400 font-bold">
                {nextDose ? (nextDose.isToday ? 'Hoje' : 'Amanhã') : '--'}
              </span>
            </div>

            {nextDose ? (
              <div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-white truncate max-w-[170px]">
                    {nextDose.medication.name}
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {nextDose.time}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{nextDose.medication.dosage}</span>
                  <span className="text-teal-300 font-semibold bg-teal-500/10 px-1.5 py-0.2 rounded">
                    em {nextDose.formattedTimeRemaining}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mt-1">Nenhuma dose programada ativa.</p>
            )}
          </div>

          {/* Today's Adherence Rate */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Adesão do Dia
              </span>
              <span className="font-mono text-white font-bold">{takenDosesToday} de {totalDosesToday} doses</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg font-bold text-white">{adherenceRate}%</span>
                <span className="text-[11px] text-slate-400">Meta: 100%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${adherenceRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Treatments Count */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Pill className="w-3.5 h-3.5 text-blue-400" /> Tratamentos Ativos
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Em curso</span>
            </div>

            <div>
              <div className="text-lg font-bold text-white">
                {activeMeds.length} <span className="text-xs font-normal text-slate-400">medicamentos cadastrados</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {activeMeds.map(m => m.name.split(' ')[0]).join(', ')}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Add Medication Drawer Form */}
      {showAddForm && (
        <form onSubmit={handleAddMed} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg animate-in fade-in duration-200">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Cadastrar Novo Medicamento & Horários de Notificação
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Medicamento *</label>
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Dosagem *</label>
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Horário Principal</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Adicionar Mais Horários no Dia</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTime}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  + Incluir
                </button>
              </div>
              {additionalTimes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {additionalTimes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20">
                      {t}
                      <button type="button" onClick={() => handleRemoveCustomTime(t)} className="text-emerald-400 hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
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

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Instruções de Tomada (aparecerão na Notificação)</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Tomar após o almoço com 1 copo de água"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
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
              Salvar Medicamento & Ativar Lembretes
            </button>
          </div>
        </form>
      )}

      {/* Schedule Today Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Lembretes & Tomadas Programadas de Hoje</h2>
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
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isTaken 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  <div 
                    onClick={() => toggleCheckDose(doseKey)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isTaken ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500'
                    }`}>
                      {isTaken ? <CheckCircle2 className="w-4 h-4 stroke-[3]" /> : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isTaken ? 'line-through opacity-80' : 'text-white'}`}>
                          {med.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {med.dosage}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-medium border border-teal-500/20">
                          {med.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {med.instructions} • <span className="italic">{med.purpose}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTestAlert(med);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
                      title={`Disparar teste de notificação agora para ${med.name}`}
                    >
                      <Bell className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Medication Alert Log Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Histórico de Lembretes Disparados</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Fechar
              </button>
            </div>

            {alertHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma notificação registrada ainda. Os alertas disparados hoje pelo navegador aparecerão aqui.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {alertHistory.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{item.medicationName} ({item.dosage})</div>
                      <div className="text-[11px] text-slate-400">Horário programado: {item.time}</div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Medications Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Todos os Tratamentos Ativos</h2>
          </div>
          <span className="text-xs text-slate-400">{activeMeds.length} prescrições</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMeds.map((med) => (
            <div key={med.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{med.name}</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">{med.dosage}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {med.frequency}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Horários de alerta: <strong className="text-white font-mono">{med.timesOfDay.join(', ')}</strong></span>
                </div>
                <p className="text-slate-400"><strong className="text-slate-300">Prescrito por:</strong> {med.prescribedBy}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Finalidade:</strong> {med.purpose}</p>
              </div>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <button
                  onClick={() => handleRunTestAlert(med)}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Testar notificação</span>
                </button>

                <button
                  onClick={() => onToggleActive(med.id)}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Encerrar tratamento
                </button>
              </div>
            </div>
          ))}
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

