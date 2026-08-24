import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  FileText, 
  TrendingUp, 
  Pill, 
  Stethoscope, 
  Syringe, 
  AlertTriangle 
} from 'lucide-react';
import { Exam, MetricEntry, Medication, MedicalRecord, Vaccine, Allergy } from '../types';

interface AddRecordModalProps {
  onClose: () => void;
  onAddExam: (exam: Exam) => void;
  onAddMetric: (metric: MetricEntry) => void;
  onAddMedication: (med: Medication) => void;
  onAddRecord: (record: MedicalRecord) => void;
  onAddVaccine: (vax: Vaccine) => void;
  onAddAllergy: (alg: Allergy) => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  onClose,
  onAddExam,
  onAddMetric,
  onAddMedication,
  onAddRecord,
  onAddVaccine,
  onAddAllergy
}) => {
  const [recordType, setRecordType] = useState<'exam' | 'metric' | 'medication' | 'record' | 'vaccine' | 'allergy'>('exam');

  // Common fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (recordType === 'exam') {
      onAddExam({
        id: `ex-${Date.now()}`,
        title,
        category: 'Laboratorial',
        specialty: 'Clínica Geral',
        date,
        doctorName: doctorName || 'Dr. Médico',
        laboratory: 'Laboratório Fleury',
        statusAlert: 'Normal',
        values: [
          { name: title, value: value || 'Normal', unit: '', referenceRange: 'Normal', status: 'Normal' }
        ],
        summary: notes || 'Exame registrado com sucesso pelo usuário no aplicativo Vita4Me.',
        translatedExplanation: 'Exame registrado de forma manual. Seus indicadores foram mantidos na linha do tempo.'
      });
    } else if (recordType === 'metric') {
      onAddMetric({
        id: `m-${Date.now()}`,
        date,
        type: 'colesterol_ldl',
        value: parseFloat(value) || 120,
        unit: 'mg/dL',
        notes
      });
    } else if (recordType === 'medication') {
      onAddMedication({
        id: `med-${Date.now()}`,
        name: title,
        dosage: value || '1 comprimido',
        frequency: 'Diária',
        timesOfDay: ['08:00'],
        startDate: date,
        instructions: notes || 'Tomar com água.',
        active: true,
        prescribedBy: doctorName || 'Dr. Médico',
        purpose: 'Tratamento de Saúde'
      });
    } else if (recordType === 'record') {
      onAddRecord({
        id: `rec-${Date.now()}`,
        date,
        type: 'Consulta',
        title,
        doctorName: doctorName || 'Dr. Médico',
        specialty: 'Clínica Geral',
        facility: 'Consultório Médico',
        notes,
        tags: ['Registrado']
      });
    } else if (recordType === 'vaccine') {
      onAddVaccine({
        id: `vax-${Date.now()}`,
        name: title,
        doseInfo: 'Dose Registrada',
        dateAdministered: date,
        status: 'Em dia',
        location: 'UBS / Posto de Saúde'
      });
    } else if (recordType === 'allergy') {
      onAddAllergy({
        id: `alg-${Date.now()}`,
        allergen: title,
        category: 'Medicamentosa',
        severity: 'Moderada',
        reaction: notes || 'Reação alérgica relatada.'
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-6">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Adicionar Novo Registro</h2>
            <p className="text-xs text-slate-400">Insira exames, consultas, medicamentos ou medições no seu histórico</p>
          </div>
        </div>

        {/* Record Type Selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'exam', label: 'Exame', icon: FileText },
            { id: 'metric', label: 'Indicador', icon: TrendingUp },
            { id: 'medication', label: 'Remédio', icon: Pill },
            { id: 'record', label: 'Consulta', icon: Stethoscope },
            { id: 'vaccine', label: 'Vacina', icon: Syringe },
            { id: 'allergy', label: 'Alergia', icon: AlertTriangle }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = recordType === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRecordType(item.id as any)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Título / Nome do Registro
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Hemograma / Consulta de Rotina / Losartana"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Médico / Profissional</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Nome do Médico"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor / Resultado / Dosagem</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 120 mg/dL / 50mg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Observações / Anotações</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anote detalhes relevantes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
            >
              Salvar no Histórico
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
