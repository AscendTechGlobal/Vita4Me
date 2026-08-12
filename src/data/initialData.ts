import { 
  UserProfile, 
  Exam, 
  MedicalRecord, 
  MetricEntry, 
  Medication, 
  Vaccine, 
  Allergy, 
  Procedure, 
  DailyHabits, 
  DocumentItem 
} from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Eduardo Weber',
  email: 'eduardo.weber@healthai.com.br',
  age: 38,
  gender: 'Masculino',
  bloodType: 'O+',
  heightCm: 178,
  weightKg: 78.5,
  emergencyContact: {
    name: 'Mariana Weber',
    relationship: 'Esposa',
    phone: '(11) 98765-4321'
  },
  plan: 'Plus',
  cpf: '342.***.***-09'
};

export const initialExams: Exam[] = [
  {
    id: 'ex-001',
    title: 'Hemograma Completo e Perfil Lipídico',
    category: 'Laboratorial',
    specialty: 'Clinica Geral',
    date: '2026-06-15',
    doctorName: 'Dr. Roberto Mendonça',
    laboratory: 'Laboratório Fleury',
    statusAlert: 'Atenção',
    values: [
      { name: 'Hemoglobina', value: 15.2, unit: 'g/dL', referenceRange: '13.5 - 17.5', status: 'Normal' },
      { name: 'Leucócitos', value: 6800, unit: '/mm³', referenceRange: '4000 - 10000', status: 'Normal' },
      { name: 'Plaquetas', value: 245000, unit: '/mm³', referenceRange: '150000 - 450000', status: 'Normal' },
      { name: 'Colesterol Total', value: 215, unit: 'mg/dL', referenceRange: 'Desejável < 190', status: 'Atenção' },
      { name: 'Colesterol HDL', value: 52, unit: 'mg/dL', referenceRange: 'Desejável > 40', status: 'Normal' },
      { name: 'Colesterol LDL', value: 138, unit: 'mg/dL', referenceRange: 'Desejável < 100', status: 'Atenção' },
      { name: 'Triglicérides', value: 125, unit: 'mg/dL', referenceRange: 'Desejável < 150', status: 'Normal' },
      { name: 'Glicemia em Jejum', value: 92, unit: 'mg/dL', referenceRange: '70 - 99', status: 'Normal' },
      { name: 'Vitamina D (25-OH)', value: 28.5, unit: 'ng/mL', referenceRange: '30.0 - 60.0', status: 'Atenção' }
    ],
    summary: 'Hemograma normal. Discreta elevação do Colesterol LDL (138 mg/dL) e Vitamina D levemente abaixo do ideal (28.5 ng/mL).',
    translatedExplanation: 'O seu sangue apresenta excelente contagem de células de defesa (leucócitos) e de coagulação (plaquetas). Seu açucar no sangue (glicemia) está ótimo. Houve uma pequena alteração no colesterol ruim (LDL), recomendando-se ajustes sutis na dieta com orientação nutricional. A Vitamina D está limítrofe, podendo se beneficiar de suplementação leve prescrita pelo seu médico.'
  },
  {
    id: 'ex-002',
    title: 'Ecocardiograma Transtorácico',
    category: 'Cardiologia',
    specialty: 'Cardiologia',
    date: '2026-03-10',
    doctorName: 'Dra. Patricia Lima',
    laboratory: 'Hospital Israelita Albert Einstein',
    statusAlert: 'Normal',
    values: [
      { name: 'Fração de Ejeção', value: 66, unit: '%', referenceRange: '> 55%', status: 'Normal' },
      { name: 'Atrio Esquerdo', value: 34, unit: 'mm', referenceRange: '28 - 40 mm', status: 'Normal' },
      { name: 'Espessura do Septo', value: 9, unit: 'mm', referenceRange: '6 - 11 mm', status: 'Normal' }
    ],
    summary: 'Exame de imagem cardíaca perfeitamente dentro dos padrões de normalidade, sem alterações de válvulas ou hipertrofia.',
    translatedExplanation: 'Seu coração apresenta estrutura e força de bombeamento perfeitamente saudáveis. O músculo cardíaco relaxa e contrai normalmente sem nenhum sinal de sobrecarga.'
  },
  {
    id: 'ex-003',
    title: 'Dosagem Hormonal & Tireoide (TSH / T4 Livre)',
    category: 'Endocrinologia',
    specialty: 'Endocrinologia',
    date: '2025-11-20',
    doctorName: 'Dr. Fernando Alvarez',
    laboratory: 'Alta Diagnósticos',
    statusAlert: 'Normal',
    values: [
      { name: 'TSH Basal', value: 2.14, unit: 'mUI/L', referenceRange: '0.4 - 4.3 mUI/L', status: 'Normal' },
      { name: 'T4 Livre', value: 1.25, unit: 'ng/dL', referenceRange: '0.8 - 1.8 ng/dL', status: 'Normal' },
      { name: 'Ferritina', value: 142, unit: 'ng/mL', referenceRange: '30 - 400 ng/mL', status: 'Normal' }
    ],
    summary: 'Função tireoidiana normal. TSH e T4 livre em níveis ideais.',
    translatedExplanation: 'Sua glândula tireoide, responsável pelo metabolismo do corpo, está funcionando perfeitamente em equilíbrio hormonal.'
  }
];

export const initialMedicalRecords: MedicalRecord[] = [
  {
    id: 'rec-001',
    date: '2026-06-18',
    type: 'Consulta',
    title: 'Rotina Anual & Avaliação Metabólica',
    doctorName: 'Dr. Roberto Mendonça',
    specialty: 'Clínica Geral',
    facility: 'Consultório Particular - Jardins',
    notes: 'Paciente assintomático. Avaliados exames de sangue recentes. Orientado melhora no consumo de fibras e caminhadas diárias para controle do LDL. Prescrita Vitamina D 2.000 UI/dia por 60 dias.',
    diagnosis: 'Hipercolesterolemia leve (E78.0) / Hipovitaminose D leve (E55.9)',
    prescriptionSummary: 'Vitamina D3 2000 UI gotas - 1 x ao dia',
    tags: ['Rotina', 'Checkup', 'Vitamina D']
  },
  {
    id: 'rec-002',
    date: '2026-03-10',
    type: 'Consulta',
    title: 'Acompanhamento Cardiológico preventivo',
    doctorName: 'Dra. Patricia Lima',
    specialty: 'Cardiologia',
    facility: 'Hospital Albert Einstein',
    notes: 'Ecocardiograma normal. Pressão arterial aferida em consultório: 120x80 mmHg. Liberado para atividades físicas de moderada e alta intensidade.',
    diagnosis: 'Aparelho cardiovascular hígido',
    tags: ['Coração', 'Checkup Esportivo']
  },
  {
    id: 'rec-003',
    date: '2024-08-12',
    type: 'Procedimento',
    title: 'Artroscopia de Joelho Direito',
    doctorName: 'Dr. Marcos Siqueira',
    specialty: 'Ortopedia e Traumatologia',
    facility: 'Hospital Sírio-Libanês',
    notes: 'Meniscectomia parcial do menisco medial sem intercorrências. Realizadas 15 sessões de fisioterapia no pós-operatório com recuperação completa.',
    diagnosis: 'Lesão meniscal degenerativa (M23.2)',
    tags: ['Cirurgia', 'Ortopedia', 'Joelho']
  },
  {
    id: 'rec-004',
    date: '2025-05-02',
    type: 'Vacina',
    title: 'Vacina Influeza Tetravalente (Gripe)',
    doctorName: 'Dra. Juliana Vasconcelos',
    specialty: 'Imunologia / Vacinação',
    facility: 'Drogaria São Paulo / Sala de Vacinas',
    notes: 'Aplicada dose única anual no braço esquerdo sem efeitos adversos.',
    tags: ['Vacina', 'Gripe', 'Imunização']
  }
];

export const initialMetrics: MetricEntry[] = [
  // Colesterol LDL over time
  { id: 'm-01', date: '2024-01-10', type: 'colesterol_ldl', value: 155, unit: 'mg/dL', notes: 'Início de mudanças na alimentação' },
  { id: 'm-02', date: '2024-07-15', type: 'colesterol_ldl', value: 142, unit: 'mg/dL' },
  { id: 'm-03', date: '2025-02-10', type: 'colesterol_ldl', value: 135, unit: 'mg/dL' },
  { id: 'm-04', date: '2025-09-05', type: 'colesterol_ldl', value: 130, unit: 'mg/dL' },
  { id: 'm-05', date: '2026-06-15', type: 'colesterol_ldl', value: 138, unit: 'mg/dL', notes: 'Aumento leve - pós férias' },

  // Pressão Arterial
  { id: 'm-06', date: '2026-05-01', type: 'pressao_arterial', value: 120, valueSecondary: 80, unit: 'mmHg' },
  { id: 'm-07', date: '2026-05-15', type: 'pressao_arterial', value: 118, valueSecondary: 78, unit: 'mmHg' },
  { id: 'm-08', date: '2026-06-01', type: 'pressao_arterial', value: 122, valueSecondary: 82, unit: 'mmHg' },
  { id: 'm-09', date: '2026-06-15', type: 'pressao_arterial', value: 120, valueSecondary: 80, unit: 'mmHg' },
  { id: 'm-10', date: '2026-07-01', type: 'pressao_arterial', value: 115, valueSecondary: 75, unit: 'mmHg' },

  // Glicemia em Jejum
  { id: 'm-11', date: '2024-01-10', type: 'glicemia', value: 96, unit: 'mg/dL' },
  { id: 'm-12', date: '2025-02-10', type: 'glicemia', value: 90, unit: 'mg/dL' },
  { id: 'm-13', date: '2026-06-15', type: 'glicemia', value: 92, unit: 'mg/dL' },

  // Peso Corporal
  { id: 'm-14', date: '2026-03-01', type: 'peso', value: 81.2, unit: 'kg' },
  { id: 'm-15', date: '2026-04-01', type: 'peso', value: 80.0, unit: 'kg' },
  { id: 'm-16', date: '2026-05-01', type: 'peso', value: 79.4, unit: 'kg' },
  { id: 'm-17', date: '2026-06-01', type: 'peso', value: 78.8, unit: 'kg' },
  { id: 'm-18', date: '2026-07-01', type: 'peso', value: 78.5, unit: 'kg' },

  // Vitamina D
  { id: 'm-19', date: '2024-01-10', type: 'vitamina_d', value: 22.0, unit: 'ng/mL' },
  { id: 'm-20', date: '2025-02-10', type: 'vitamina_d', value: 34.5, unit: 'ng/mL' },
  { id: 'm-21', date: '2026-06-15', type: 'vitamina_d', value: 28.5, unit: 'ng/mL' }
];

export const initialMedications: Medication[] = [
  {
    id: 'med-01',
    name: 'Vitamina D3 2.000 UI',
    dosage: '1 cápsula (2000 UI)',
    frequency: 'Diária',
    timesOfDay: ['08:00'],
    startDate: '2026-06-20',
    endDate: '2026-08-20',
    instructions: 'Tomar junto com o café da manhã ou refeição gordurosa para melhor absorção.',
    active: true,
    prescribedBy: 'Dr. Roberto Mendonça',
    purpose: 'Reposição de Vitamina D'
  },
  {
    id: 'med-02',
    name: 'Ômega 3 1000mg',
    dosage: '1 cápsula',
    frequency: 'Diária',
    timesOfDay: ['12:30'],
    startDate: '2026-01-10',
    instructions: 'Tomar com o almoço. Auxilia na saúde cardiovascular.',
    active: true,
    prescribedBy: 'Suplementação Pessoal / Recomendação Nutricional',
    purpose: 'Suporte Cardiovascular & Anti-inflamatório'
  },
  {
    id: 'med-03',
    name: 'Amoxicilina 500mg',
    dosage: '1 comprimido a cada 8h',
    frequency: 'De 8 em 8 horas',
    timesOfDay: ['06:00', '14:00', '22:00'],
    startDate: '2025-10-10',
    endDate: '2025-10-17',
    instructions: 'Tratamento prescrito para sinusite aguda. Finalizado.',
    active: false,
    prescribedBy: 'Dr. Lucas Prado (Otorrino)',
    purpose: 'Infecção Respiratória Superior'
  }
];

export const initialVaccines: Vaccine[] = [
  {
    id: 'vax-01',
    name: 'COVID-19 Bivalente',
    doseInfo: 'Dose de Reforço 2025',
    dateAdministered: '2025-04-12',
    status: 'Em dia',
    location: 'UBS Vila Mariana',
    batchNumber: 'FX9842'
  },
  {
    id: 'vax-02',
    name: 'Influenza (Gripe 2026)',
    doseInfo: 'Dose Anual 2026',
    dateAdministered: '2026-05-02',
    status: 'Em dia',
    location: 'Drogaria São Paulo',
    batchNumber: 'INF-2026-A'
  },
  {
    id: 'vax-03',
    name: 'dTpa (Tríplice Acelular do Adulto - Tétano, Difteria, Coqueluche)',
    doseInfo: 'Reforço de 10 em 10 anos',
    dateAdministered: '2018-09-10',
    dueDate: '2028-09-10',
    status: 'Em dia',
    location: 'Centro de Imunização Fleury'
  },
  {
    id: 'vax-04',
    name: 'Hepatite B',
    doseInfo: '3 Doses Concluídas',
    dateAdministered: '2015-03-20',
    status: 'Em dia',
    location: 'UBS Central'
  },
  {
    id: 'vax-05',
    name: 'Dengue (Qdenga / Dose 2)',
    doseInfo: 'Segunda Dose',
    dueDate: '2026-09-15',
    status: 'Pendente',
    location: 'Clínica de Vacinas do Einstein'
  }
];

export const initialAllergies: Allergy[] = [
  {
    id: 'alg-01',
    allergen: 'Dipirona Sódica',
    category: 'Medicamentosa',
    severity: 'Moderada',
    reaction: 'Urticária, vermelhidão na pele e prurido intenso 30 minutos após ingestão.',
    diagnosedDate: '2019-04-15'
  },
  {
    id: 'alg-02',
    allergen: 'Camarão e Crustáceos',
    category: 'Alimentar',
    severity: 'Grave',
    reaction: 'Sensação de edema na garganta e estresse respiratório. Requer atenção imediata.',
    diagnosedDate: '2012-11-03'
  },
  {
    id: 'alg-03',
    allergen: 'Poeira & Ácaros',
    category: 'Ambiental',
    severity: 'Leve',
    reaction: 'Rinite alérgica sazonal, espirros e coriza leve.',
    diagnosedDate: '2010-01-10'
  }
];

export const initialProcedures: Procedure[] = [
  {
    id: 'proc-01',
    title: 'Artroscopia de Joelho Direito',
    type: 'Cirurgia',
    date: '2024-08-12',
    doctorName: 'Dr. Marcos Siqueira',
    hospital: 'Hospital Sírio-Libanês',
    outcome: 'Meniscectomia parcial bem sucedida',
    notes: 'Incisões consolidadas sem cicatrizes hipertróficas. Amplitude articular 100% recuperada.'
  },
  {
    id: 'proc-02',
    title: 'Colonoscopia Preventiva',
    type: 'Procedimento',
    date: '2023-11-05',
    doctorName: 'Dra. Claudia Ramos',
    hospital: 'Fleury Medicina Diagnóstica',
    outcome: 'Exame normal, sem pólipos ou lesões mucosas',
    notes: 'Recomendada repetição em 5 anos (2028).'
  }
];

export const initialDailyHabits: DailyHabits = {
  date: new Date().toISOString().split('T')[0],
  waterIntakeMl: 2100,
  waterGoalMl: 2800,
  sleepHours: 7.5,
  sleepQuality: 'Excelente',
  mood: 'Ótimo',
  physicalActivityMins: 45,
  activityType: 'Corrida ao ar livre (5.2 km)',
  bodyWeightKg: 78.5,
  notes: 'Boa disposição durante o dia. Alimentação focada em proteínas limpas e saladas.'
};

export const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-01',
    title: 'Receita Médica - Vitamina D3 2000UI',
    type: 'Receita',
    uploadDate: '2026-06-18',
    doctorName: 'Dr. Roberto Mendonça',
    fileSize: '1.2 MB',
    notes: 'Validade de 6 meses.',
    tags: ['Suplementação', 'Receita']
  },
  {
    id: 'doc-02',
    title: 'Atestado Médico Esportivo - Liberado para Corrida',
    type: 'Atestado',
    uploadDate: '2026-03-10',
    doctorName: 'Dra. Patricia Lima',
    fileSize: '850 KB',
    notes: 'Apresentado na maratona de SP.',
    tags: ['Cardiologia', 'Esporte']
  },
  {
    id: 'doc-03',
    title: 'Laudo Completo - Ecocardiograma Transtorácico',
    type: 'Laudo',
    uploadDate: '2026-03-10',
    doctorName: 'Dra. Patricia Lima',
    fileSize: '3.4 MB',
    notes: 'Laudo impresso e assinado digitalmente.',
    tags: ['Laudo', 'Imagem']
  }
];
