import { LabExam, HealthIndicator, Medication, HealthRecord, FamilyMember, DailyHabit } from '../types';

export const INITIAL_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'fam-me',
    user_id: 'usr-default',
    name: 'Eduardo Weber (Você)',
    relationship: 'Titular',
    date_of_birth: '1988-06-14',
    blood_type: 'O+',
    allergies: ['Penicilina', 'Dipirona'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fam-spouse',
    user_id: 'usr-default',
    name: 'Camila Weber',
    relationship: 'Cônjuge',
    date_of_birth: '1990-11-22',
    blood_type: 'A+',
    allergies: ['Frutos do Mar'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fam-child',
    user_id: 'usr-default',
    name: 'Lucas Weber',
    relationship: 'Filho(a)',
    date_of_birth: '2020-04-10',
    blood_type: 'O+',
    allergies: [],
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

export const INITIAL_EXAMS: LabExam[] = [
  {
    id: 'exam-001',
    user_id: 'usr-default',
    family_member_id: 'fam-me',
    title: 'Hemograma Completo e Perfil Lipídico',
    category: 'Laboratorial',
    exam_date: '2026-07-15',
    laboratory: 'Laboratório Fleury / Dasa',
    doctor_name: 'Dr. Roberto Silveira (Cardiologista)',
    status: 'processed',
    ai_summary: 'Exame de rotina com hemograma normal e discreta elevação do Colesterol LDL.',
    ai_simple_translation: 'O seu sangue apresenta quantidade normal de glóbulos vermelhos (sem anemia) e células de defesa em perfeito estado. O colesterol ruim (LDL) está um pouco acima do desejável (138 mg/dL), sugerindo ajustes na alimentação e prática aeróbica.',
    ai_key_findings: [
      { parameter: 'Hemoglobina', value: '15.4 g/dL', status: 'normal', simpleExplanation: 'Oxigenação sanguínea saudável, sem sinais de anemia.' },
      { parameter: 'Colesterol Total', value: '215 mg/dL', status: 'attention', simpleExplanation: 'Levemente acima do ideal de 200 mg/dL.' },
      { parameter: 'Colesterol LDL', value: '138 mg/dL', status: 'altered', simpleExplanation: 'Colesterol ruim um pouco alto (meta: abaixo de 100 mg/dL).' },
      { parameter: 'Colesterol HDL', value: '52 mg/dL', status: 'normal', simpleExplanation: 'Colesterol bom em nível protetor cardiovascular.' },
      { parameter: 'Glicemia de Jejum', value: '89 mg/dL', status: 'normal', simpleExplanation: 'Nível de açúcar no sangue perfeito e saudável.' },
    ],
    created_at: '2026-07-16T10:00:00Z',
  },
  {
    id: 'exam-002',
    user_id: 'usr-default',
    family_member_id: 'fam-me',
    title: 'Vitamina D, Ferritina e TSH Ultra Sensível',
    category: 'Laboratorial',
    exam_date: '2026-05-10',
    laboratory: 'Laboratório Sabin',
    doctor_name: 'Dra. Juliana Mendes (Endocrinologista)',
    status: 'processed',
    ai_summary: 'Função tireoidiana normal. Vitamina D em nível ideal após suplementação.',
    ai_simple_translation: 'A sua tireoide está funcionando com perfeição (TSH normal). A taxa de Vitamina D subiu para 42 ng/mL (ótimo para ossos e imunidade). A ferritina (reserva de ferro) está bem equilibrada.',
    ai_key_findings: [
      { parameter: 'Vitamina D 25-OH', value: '42.0 ng/mL', status: 'normal', simpleExplanation: 'Nível ótimo de vitamina D para imunidade e ossos.' },
      { parameter: 'TSH Ultra Sensível', value: '2.1 mIU/L', status: 'normal', simpleExplanation: 'Tireoide trabalhando no ritmo ideal.' },
      { parameter: 'Ferritina Sérica', value: '165 ng/mL', status: 'normal', simpleExplanation: 'Reserva de ferro saudável no organismo.' },
    ],
    created_at: '2026-05-11T14:20:00Z',
  },
  {
    id: 'exam-003',
    user_id: 'usr-default',
    family_member_id: 'fam-me',
    title: 'Ultrassonografia de Abdome Total',
    category: 'Imagem',
    exam_date: '2026-03-20',
    laboratory: 'Centro de Diagnóstico por Imagem',
    doctor_name: 'Dr. Marcos Fontes',
    status: 'processed',
    ai_summary: 'Fígado, rins e pâncreas de aspecto anatômico normal. Ausência de cálculos.',
    ai_simple_translation: 'Todos os órgãos avaliados no abdome estão com tamanho, formato e texturas normais. Não há pedras na vesícula ou nos rins nem gordura no fígado.',
    ai_key_findings: [
      { parameter: 'Fígado', value: 'Normal', status: 'normal', simpleExplanation: 'Dimensões normais, sem esteatose hepática.' },
      { parameter: 'Vesícula Biliar', value: 'Sem cálculos', status: 'normal', simpleExplanation: 'Livre de pedras ou inflamações.' },
      { parameter: 'Rins', value: 'Tópicos e normais', status: 'normal', simpleExplanation: 'Boa espessura cortical e sem dilatação.' },
    ],
    created_at: '2026-03-21T09:00:00Z',
  }
];

export const INITIAL_INDICATORS: HealthIndicator[] = [
  // Glicemia
  { id: 'ind-1', user_id: 'usr-default', name: 'Glicemia', category: 'Metabólico', value: 89, unit: 'mg/dL', reference_min: 70, reference_max: 99, measured_at: '2026-07-15T08:00:00Z', status: 'normal', created_at: '2026-07-15T08:00:00Z' },
  { id: 'ind-2', user_id: 'usr-default', name: 'Glicemia', category: 'Metabólico', value: 92, unit: 'mg/dL', reference_min: 70, reference_max: 99, measured_at: '2026-05-10T08:00:00Z', status: 'normal', created_at: '2026-05-10T08:00:00Z' },
  { id: 'ind-3', user_id: 'usr-default', name: 'Glicemia', category: 'Metabólico', value: 95, unit: 'mg/dL', reference_min: 70, reference_max: 99, measured_at: '2026-01-20T08:00:00Z', status: 'normal', created_at: '2026-01-20T08:00:00Z' },
  
  // Colesterol Total
  { id: 'ind-4', user_id: 'usr-default', name: 'Colesterol Total', category: 'Lipídico', value: 215, unit: 'mg/dL', reference_min: 120, reference_max: 190, measured_at: '2026-07-15T08:00:00Z', status: 'borderline', created_at: '2026-07-15T08:00:00Z' },
  { id: 'ind-5', user_id: 'usr-default', name: 'Colesterol Total', category: 'Lipídico', value: 228, unit: 'mg/dL', reference_min: 120, reference_max: 190, measured_at: '2026-01-20T08:00:00Z', status: 'high', created_at: '2026-01-20T08:00:00Z' },

  // Vitamina D
  { id: 'ind-6', user_id: 'usr-default', name: 'Vitamina D', category: 'Vitaminas', value: 42.0, unit: 'ng/mL', reference_min: 30, reference_max: 60, measured_at: '2026-05-10T08:00:00Z', status: 'normal', created_at: '2026-05-10T08:00:00Z' },
  { id: 'ind-7', user_id: 'usr-default', name: 'Vitamina D', category: 'Vitaminas', value: 24.5, unit: 'ng/mL', reference_min: 30, reference_max: 60, measured_at: '2025-11-15T08:00:00Z', status: 'low', created_at: '2025-11-15T08:00:00Z' },

  // Pressão Arterial
  { id: 'ind-8', user_id: 'usr-default', name: 'Pressão Sistólica', category: 'Vital', value: 120, unit: 'mmHg', reference_min: 90, reference_max: 129, measured_at: '2026-08-10T09:00:00Z', status: 'normal', created_at: '2026-08-10T09:00:00Z' },
  { id: 'ind-9', user_id: 'usr-default', name: 'Pressão Diastólica', category: 'Vital', value: 80, unit: 'mmHg', reference_min: 60, reference_max: 84, measured_at: '2026-08-10T09:00:00Z', status: 'normal', created_at: '2026-08-10T09:00:00Z' },

  // Peso
  { id: 'ind-10', user_id: 'usr-default', name: 'Peso', category: 'Vital', value: 78.5, unit: 'kg', measured_at: '2026-08-12T07:00:00Z', status: 'normal', created_at: '2026-08-12T07:00:00Z' },
  { id: 'ind-11', user_id: 'usr-default', name: 'Peso', category: 'Vital', value: 80.2, unit: 'kg', measured_at: '2026-06-01T07:00:00Z', status: 'normal', created_at: '2026-06-01T07:00:00Z' },
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    user_id: 'usr-default',
    name: 'Vitamina D3 2.000 UI',
    dosage: '1 cápsula (2.000 UI)',
    frequency: '1x ao dia pela manhã',
    schedule_times: ['08:00'],
    instructions: 'Tomar junto com o café da manhã ou refeição que contenha gorduras boas.',
    prescribed_by: 'Dra. Juliana Mendes',
    is_continuous: true,
    is_active: true,
    created_at: '2026-05-12T00:00:00Z',
  },
  {
    id: 'med-2',
    user_id: 'usr-default',
    name: 'Ômega 3 TG 1000mg',
    dosage: '2 cápsulas',
    frequency: '1x ao dia no almoço',
    schedule_times: ['12:30'],
    instructions: 'Auxílio na modulação lipídica e proteção vascular.',
    prescribed_by: 'Dr. Roberto Silveira',
    is_continuous: true,
    is_active: true,
    created_at: '2026-07-16T00:00:00Z',
  }
];

export const INITIAL_RECORDS: HealthRecord[] = [
  {
    id: 'rec-1',
    user_id: 'usr-default',
    record_type: 'consulta',
    title: 'Consulta de Rotina com Cardiologista',
    description: 'Eletrocardiograma de repouso normal. Solicitados exames de sangue e teste ergométrico para liberação de treinos.',
    doctor_or_institution: 'Dr. Roberto Silveira (Hospital Albert Einstein)',
    event_date: '2026-07-15',
    tags: ['Cardiologia', 'Checkup', 'ECG'],
    created_at: '2026-07-15T11:00:00Z',
  },
  {
    id: 'rec-2',
    user_id: 'usr-default',
    record_type: 'vacina',
    title: 'Vacina da Gripe Influenza Trivalente',
    description: 'Dose anual aplicada no braço esquerdo sem reações adversas.',
    doctor_or_institution: 'Clínica de Vacinação Imune',
    event_date: '2026-04-18',
    tags: ['Imunização', 'Gripe', 'Anual'],
    created_at: '2026-04-18T15:00:00Z',
  },
  {
    id: 'rec-3',
    user_id: 'usr-default',
    record_type: 'alergia',
    title: 'Reação Alérgica a Penicilina / Amoxicilina',
    description: 'Apresentou erupções cutâneas e prurido após administração em 2018. Deve ser evitada qualquer medicação da classe dos beta-lactâmicos.',
    doctor_or_institution: 'Pronto Socorro Geral',
    event_date: '2018-09-10',
    tags: ['Alergia Medicamentosa', 'Alerta Crítico'],
    created_at: '2026-01-01T00:00:00Z',
  }
];

export const INITIAL_HABIT: DailyHabit = {
  user_id: 'usr-default',
  log_date: new Date().toISOString().split('T')[0],
  water_ml: 1750,
  sleep_hours: 7.5,
  exercise_minutes: 45,
  mood: 'Excelente',
  notes: 'Treino de corrida 5km pela manhã e boa hidratação.'
};
