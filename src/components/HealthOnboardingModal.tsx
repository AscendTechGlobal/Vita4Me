import React, { useState } from "react";
import { 
  Heart, 
  User, 
  Activity, 
  Pill, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Phone, 
  Flame, 
  Wine, 
  Cigarette,
  Loader2,
  AlertCircle
} from "lucide-react";
import { FamilyMember, UserProfile } from "../types";
import { saveIndicator, saveMedication, saveHealthRecord } from "../lib/healthStorage";
import { trackEvent } from "../lib/analytics";

interface HealthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'family';
  initialName?: string;
  initialProfile?: UserProfile | null;
  relationship?: FamilyMember['relationship'];
  onSaveCompleted: (data: {
    name: string;
    birthDate: string;
    gender: string;
    bloodType: string;
    height: number;
    weight: number;
    smoking: string;
    alcohol: string;
    activity: string;
    chronicConditions: string[];
    allergies: string[];
    medications: Array<{ name: string; dosage: string; frequency: string; schedule: string }>;
    emergencyName: string;
    emergencyPhone: string;
  }) => Promise<{ success: boolean; error?: string } | boolean | void> | void;
}

export const HealthOnboardingModal: React.FC<HealthOnboardingModalProps> = ({
  isOpen,
  onClose,
  targetType,
  initialName = "",
  initialProfile = null,
  onSaveCompleted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      trackEvent('onboarding_started', { targetType });
    }
  }, [isOpen, targetType]);

  // Step 1: Biometrics (inicializa com dados existentes do perfil se disponíveis)
  const [name, setName] = useState(initialProfile?.full_name || initialName);
  const [birthDate, setBirthDate] = useState(initialProfile?.date_of_birth || "1990-01-01");
  const [gender, setGender] = useState(initialProfile?.gender || "Masculino");
  const [bloodType, setBloodType] = useState(initialProfile?.blood_type || "O+");
  const [height, setHeight] = useState<number>(initialProfile?.height_cm || 175);
  const [weight, setWeight] = useState<number>(initialProfile?.weight_kg || 75);

  // Step 2: Lifestyle
  const [smoking, setSmoking] = useState(initialProfile?.smoking_status || "Não fumante");
  const [alcohol, setAlcohol] = useState(initialProfile?.alcohol_status || "Socialmente");
  const [activity, setActivity] = useState(initialProfile?.activity_level || "Moderado (3-4x/sem)");

  // Step 3: Conditions & Allergies
  const [selectedConditions, setSelectedConditions] = useState<string[]>(initialProfile?.chronic_conditions || []);
  const [allergiesText, setAllergiesText] = useState(initialProfile?.allergies?.join(", ") || "");

  // Step 4: Continuous Medications & Emergency
  const [medsList, setMedsList] = useState<Array<{ name: string; dosage: string; frequency: string; schedule: string }>>([]);
  const [currentMedName, setCurrentMedName] = useState("");
  const [currentMedDosage, setCurrentMedDosage] = useState("");
  const [currentMedSchedule, setCurrentMedSchedule] = useState("08:00");
  const [emergencyName, setEmergencyName] = useState(initialProfile?.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialProfile?.emergency_contact_phone || "");

  if (!isOpen) return null;

  // IMC calculation
  const heightMeters = height / 100;
  const imc = heightMeters > 0 ? (weight / (heightMeters * heightMeters)).toFixed(1) : "0";

  const conditionOptions = [
    "Hipertensão Arterial",
    "Diabetes Tipo 1 / 2",
    "Colesterol Alto (Dislipidemia)",
    "Doença Cardíaca",
    "Asma / Bronquite",
    "Hipotireoidismo / Tireoide",
    "Gastrite / Refluxo",
    "Nenhuma condição crônica",
  ];

  const toggleCondition = (cond: string) => {
    if (cond === "Nenhuma condição crônica") {
      setSelectedConditions(["Nenhuma condição crônica"]);
      return;
    }
    const filtered = selectedConditions.filter(c => c !== "Nenhuma condição crônica");
    if (filtered.includes(cond)) {
      setSelectedConditions(filtered.filter(c => c !== cond));
    } else {
      setSelectedConditions([...filtered, cond]);
    }
  };

  const handleAddMed = () => {
    if (!currentMedName.trim()) return;
    setMedsList(prev => [
      ...prev,
      {
        name: currentMedName.trim(),
        dosage: currentMedDosage.trim() || "1 dose",
        frequency: "1x ao dia",
        schedule: currentMedSchedule || "08:00",
      }
    ]);
    setCurrentMedName("");
    setCurrentMedDosage("");
  };

  const handleRemoveMed = (index: number) => {
    setMedsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      const allergiesArray = allergiesText
        ? allergiesText.split(",").map(a => a.trim()).filter(Boolean)
        : [];

      // Automatically seed weight into Indicators
      if (weight > 0) {
        saveIndicator({
          id: "ind-weight-" + Date.now(),
          user_id: "usr-default",
          name: "Peso",
          category: "Vital",
          value: Number(weight),
          unit: "kg",
          measured_at: new Date().toISOString(),
          status: "normal",
          created_at: new Date().toISOString(),
        });
      }

      // Automatically seed medications
      medsList.forEach(m => {
        saveMedication({
          id: "med-" + Math.random().toString(36).substring(2, 9),
          user_id: "usr-default",
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          schedule_times: [m.schedule],
          is_continuous: true,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      });

      // Automatically seed allergies to health records
      allergiesArray.forEach(al => {
        saveHealthRecord({
          id: "rec-al-" + Math.random().toString(36).substring(2, 9),
          user_id: "usr-default",
          record_type: "alergia",
          title: `Alergia: ${al}`,
          description: "Declarada na anamnese médica inicial.",
          event_date: new Date().toISOString().split("T")[0],
          tags: ["Alergia", "Anamnese"],
          created_at: new Date().toISOString(),
        });
      });

      const result = await onSaveCompleted({
        name: name.trim() || "Paciente",
        birthDate,
        gender,
        bloodType,
        height: Number(height) || 0,
        weight: Number(weight) || 0,
        smoking,
        alcohol,
        activity,
        chronicConditions: selectedConditions,
        allergies: allergiesArray,
        medications: medsList,
        emergencyName: emergencyName.trim(),
        emergencyPhone: emergencyPhone.trim(),
      });

      if (result && typeof result === "object" && !result.success) {
        setErrorMessage(result.error || "Não foi possível salvar sua anamnese. Tente novamente.");
        setIsSaving(false);
        return;
      }

      if (result === false) {
        setErrorMessage("Não foi possível salvar sua anamnese. Tente novamente.");
        setIsSaving(false);
        return;
      }

      trackEvent('onboarding_completed', { targetType });
      onClose();
    } catch (err: any) {
      console.error("Erro no salvamento da anamnese:", err?.message || err);
      setErrorMessage("Não foi possível salvar sua anamnese. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 flex flex-col my-auto max-h-[92vh]">
        {/* Header with Steps */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon-transparent.png"
              alt="Vita4Me Logo"
              className="h-9 w-auto object-contain flex-shrink-0"
            />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
                VITA4ME &bull; ANAMNESE MÉDICA &bull; ETAPA {step} DE 4
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {targetType === 'family' ? `Primeiro Cadastro de ${name || 'Familiar'}` : 'Alimentação Inicial do Prontuário'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4">
          {/* STEP 1: BIOMETRICS */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>1. Identificação & Medidas Corporais</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Preencha os dados biométricos essenciais para calibrar seus indicadores de saúde.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sexo Biológico</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo Sanguíneo</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Não sei">Não sei</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Altura</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{height} cm</strong>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="220"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Peso Atual</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{weight} kg</strong>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              {/* Calculated IMC pill */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300">Índice de Massa Corporal (IMC Calculado):</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-sm">{imc} kg/m²</span>
              </div>
            </div>
          )}

          {/* STEP 2: LIFESTYLE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>2. Estilo de Vida & Hábitos</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Comportamentos que impactam diretamente sua imunidade e longevidade.
                </p>
              </div>

              {/* Smoking */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cigarette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Uso de Cigarro / Tabaco:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Não fumante", "Ex-fumante", "Ocasional", "Fumante diário"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSmoking(opt)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        smoking === opt
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alcohol */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wine className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Consumo de Bebidas Alcoólicas:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Não consome", "Socialmente", "Moderado", "Frequente"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAlcohol(opt)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        alcohol === opt
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical Activity */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Nível de Atividade Física:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Sedentário (pouco ou nenhum exercício)",
                    "Leve (1 a 2 vezes por semana)",
                    "Moderado (3 a 4 vezes por semana)",
                    "Intenso (5 ou mais vezes por semana)"
                  ].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setActivity(opt)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition cursor-pointer ${
                        activity === opt
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONDITIONS & ALLERGIES */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>3. Condições Crônicas & Alergias Conhecidas</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Selecione os diagnósticos prévios e liste alergias a remédios ou alimentos.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Condições de Saúde Preexistentes:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {conditionOptions.map(cond => {
                    const isSelected = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-500"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{cond}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alergias (Medicamentosas ou Alimentares - Separadas por vírgula):
                </label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="Ex: Penicilina, Dipirona, Frutos do Mar, Glúten..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: MEDICATIONS & EMERGENCY */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                  <span>4. Medicamentos de Uso Contínuo & Contato de Emergência</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Cadastre remédios diários para alimentar seus lembretes e dados de segurança.
                </p>
              </div>

              {/* Add med mini form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Adicionar Medicamento Contínuo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={currentMedName}
                    onChange={(e) => setCurrentMedName(e.target.value)}
                    placeholder="Nome (Ex: Losartana 50mg)"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={currentMedDosage}
                    onChange={(e) => setCurrentMedDosage(e.target.value)}
                    placeholder="Dose (Ex: 1 comprimido)"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="time"
                    value={currentMedSchedule}
                    onChange={(e) => setCurrentMedSchedule(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMed}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  + Incluir Medicamento
                </button>
              </div>

              {/* Meds list */}
              {medsList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Medicamentos a serem cadastrados:</span>
                  {medsList.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 dark:text-white">{m.name}</strong> - <span className="text-slate-500 dark:text-slate-400">{m.dosage} às {m.schedule}</span>
                      </div>
                      <button onClick={() => handleRemoveMed(idx)} className="text-rose-500 hover:text-rose-600 text-xs cursor-pointer">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Contato de Emergência
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Nome do contato (Ex: Esposa, Mãe)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Telefone (Ex: 11 98888-7777)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  alert("Por favor, preencha o nome do paciente.");
                  return;
                }
                setStep(s => s + 1);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <span>Avançar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinalSubmit}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Prontuário...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir & Alimentar Prontuário</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
