import React, { useState, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Stethoscope, 
  Trash2, 
  ArrowLeft,
  Scale
} from "lucide-react";

export type LegalTab = "privacidade" | "termos" | "cookies";

interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalDocumentsModal: React.FC<LegalDocumentsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "privacidade",
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Central de Transparência & Conformidade Legal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vita4Me • Em conformidade com a LGPD (Lei nº 13.709/2018) e CDC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("privacidade")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "privacidade"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Política de Privacidade (LGPD)</span>
          </button>

          <button
            onClick={() => setActiveTab("termos")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "termos"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>

          <button
            onClick={() => setActiveTab("cookies")}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "cookies"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Política de Cookies</span>
          </button>
        </div>

        {/* Document Content Box */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          
          {/* TAB 1: POLÍTICA DE PRIVACIDADE */}
          {activeTab === "privacidade" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Privacidade de Dados Sensíveis de Saúde
                </span>
                <p className="text-[11px] leading-relaxed">
                  O Vita4Me trata dados de saúde como dados pessoais sensíveis sob o Art. 5º, II e Art. 11, I da LGPD (Lei nº 13.709/2018), com consentimento específico, criptografia de repouso e em trânsito, e controle rigoroso de acesso por usuário.
                </p>
                <p className="text-[10px] opacity-80 pt-1">
                  Última atualização: 20 de Agosto de 2026 • Versão 2.0
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Identificação do Controlador</h3>
                <p>
                  O controlador responsável pelas decisões referentes ao tratamento dos dados pessoais no Vita4Me é a empresa mantenedora da plataforma [Razão Social / Nome do Controlador — pendência de deploy], com contato de privacidade e encarregado de dados (DPO) através do canal oficial: <code className="text-emerald-600 dark:text-emerald-400">privacidade@vita4me.app</code>.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Categorias de Dados Coletados</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Dados Cadastrais e de Acesso:</strong> Nome completo, endereço de e-mail e hash criptográfico de senha para criação e autenticação de conta.</li>
                  <li><strong>Dados Pessoais Sensíveis de Saúde:</strong> Exames laboratoriais, valores de biomarcadores, dosagens de medicamentos em uso, datas de medição e arquivos de laudos médicos submetidos voluntariamente pelo usuário.</li>
                  <li><strong>Dados de Dependentes (Plano Família):</strong> Informações inseridas pelo titular sobre dependentes familiares (nome, data de nascimento e exames), sob declaração de legitimidade legal/familiar do titular.</li>
                  <li><strong>Dados Financeiros e de Cobrança:</strong> As transações são processadas com tokenização externa pela plataforma Stripe. O Vita4Me não armazena dados de cartão de crédito em seus servidores.</li>
                  <li><strong>Dados Técnicos Sanitizados:</strong> Identificador anônimo de sessão, logs operacionais de requisições (`X-Request-ID`), métricas agregadas sem identificação pessoal e sem dados de saúde.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Finalidades e Bases Legais do Tratamento</h3>
                <div className="space-y-2">
                  <p>
                    <strong>A. Prestação dos Serviços de Prontuário Pessoal (Art. 7º, V da LGPD):</strong> Armazenar e organizar o histórico de saúde para consulta pelo próprio titular.
                  </p>
                  <p>
                    <strong>B. Tradução Didática por Inteligência Artificial (Art. 11, I da LGPD):</strong> O tratamento de dados clínicos sensíveis para geração de explicações em linguagem simples e resumos de laudos é realizado mediante <em>consentimento específico, destacado e informado</em> do usuário.
                  </p>
                  <p>
                    <strong>C. Cumprimento de Obrigações Legais e Fiscais (Art. 7º, II da LGPD):</strong> Guarda de registros financeiros e fiscais pelo prazo exigido pela legislação tributária brasileira.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Operadores e Compartilhamento de Dados com Terceiros</h3>
                <p>
                  O Vita4Me <strong>nunca comercializa ou compartilha dados pessoais de saúde</strong> para publicidade ou terceiros não autorizados. O compartilhamento ocorre estritamente com operadores essenciais à execução do serviço:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Supabase Inc.:</strong> Provedor de infraestrutura de banco de dados PostgreSQL com Row Level Security (RLS) e armazenamento em nuvem criptografado.</li>
                  <li><strong>Stripe Inc.:</strong> Processamento seguro de pagamentos e assinaturas em conformidade com o padrão PCI-DSS.</li>
                  <li><strong>Google Cloud (Gemini API):</strong> Processamento efêmero de leitura óptica de texto e tradução didática de laudos. As informações enviadas não são utilizadas pelo provedor para treinamento de modelos públicos de inteligência artificial.</li>
                  <li><strong>Sentry / Observabilidade:</strong> Rastreamento de erros técnicos com sanitização automática prévia que elimina qualquer informação médica ou pessoal.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Direitos do Titular (Art. 18 da LGPD)</h3>
                <p>
                  Você pode a qualquer momento exercer seus direitos garantidos pela LGPD, incluindo: confirmação de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, portabilidade via exportação em PDF e exclusão definitiva da conta.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Política de Exclusão e Retenção de Dados</h3>
                <p>
                  Ao solicitar a exclusão de sua conta através de <em>Configurações &rarr; Privacidade &rarr; Excluir Minha Conta</em>, o sistema executa a eliminação física imediata de seus exames, registros clínicos, dependentes e arquivos do Supabase Storage no ambiente ativo. Cópias residuais em backups automatizados de segurança são expurgadas conforme o ciclo natural de retenção da infraestrutura (até 30 dias), sem qualquer reativação ou tratamento ativo. Registros fiscais de faturamento são mantidos estritamente pelo prazo exigido pela legislação tributária aplicável.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: TERMOS DE USO */}
          {activeTab === "termos" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <Stethoscope className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Isenção de Responsabilidade Médica & Limites Clínicos
                </span>
                <p className="text-[11px] leading-relaxed">
                  O Vita4Me é uma ferramenta de letramento em saúde e organização pessoal. <strong>Não substitui consultas, pareceres ou diagnósticos médicos profissionais.</strong> Em caso de urgência ou emergência, procure imediatamente o pronto-socorro mais próximo.
                </p>
                <p className="text-[10px] opacity-80 pt-1">
                  Última atualização: 20 de Agosto de 2026 • Versão 2.0
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Objeto e Natureza do Serviço</h3>
                <p>
                  O Vita4Me disponibiliza uma plataforma web para centralização de exames, acompanhamento de indicadores clínicos, controle de horários de medicação e geração de dossiês médicos para apoio ao paciente durante suas consultas com profissionais de saúde habilitados.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Limites da Inteligência Artificial</h3>
                <p>
                  As explicações, traduções de termos laboratoriais e resumos fornecidos pelos recursos de inteligência artificial possuem caráter exclusivamente educativo e informativo. A IA não realiza consultas médicas autônomas, não prescreve terapias e não garante 100% de precisão sobre laudos complexos ou atípicos.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Gestão de Dependentes (Plano Família)</h3>
                <p>
                  Ao cadastrar dependentes no Vita4Me Família, o titular declara e garante que possui autorização legítima ou representação legal (como pátrio poder no caso de filhos menores de idade ou procuração legal para dependentes idosos) para incluir e gerenciar os respectivos dados clínicos.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Planos, Assinaturas e Teste Grátis de 7 Dias</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Período de Teste Grátis:</strong> Novos assinantes dos planos Individual ou Família contam com 7 dias corridos de teste gratuito a partir da assinatura. O cancelamento pode ser efetuado a qualquer momento sem cobrança durante esse período.</li>
                  <li><strong>Cobrança e Renovação:</strong> Após o trial, o valor correspondente ao plano e periodicidade escolhidos (mensal ou anual) é cobrado de forma automática e recorrente até o cancelamento.</li>
                  <li><strong>Cancelamento Simples:</strong> O cancelamento pode ser solicitado a qualquer momento pelo usuário diretamente no portal de assinaturas gerenciado pelo Stripe, mantendo-se o acesso ativo até o término do ciclo já faturado.</li>
                  <li><strong>Direito de Arrependimento:</strong> É garantido o direito de arrependimento em até 7 dias da primeira cobrança, nos termos do Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Uso Permitido e Proibições</h3>
                <p>
                  É estritamente vedado utilizar o Vita4Me para fins ilícitos, tentar violar a segurança da plataforma, fraudar identidades, realizar engenharia reversa ou carregar conteúdo que viole direitos de propriedade intelectual ou sigilo de terceiros.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Política de Uso Justo dos Recursos de Inteligência Artificial</h3>
                <p>
                  Os recursos de inteligência artificial estão incluídos nos planos pagos do Vita4Me e destinam-se ao uso pessoal e familiar compatível com a finalidade da plataforma. Para preservar a disponibilidade, segurança e qualidade do serviço, o Vita4Me poderá aplicar limites técnicos temporários em situações de uso automatizado, abusivo, anormal ou incompatível com a utilização regular da plataforma.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  A plataforma emprega mecanismos de rate limiting, proteções antiabuso e controles técnicos de segurança para prevenir extração automatizada de dados, scraping ou chamadas excessivas em rajada.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: POLÍTICA DE COOKIES */}
          {activeTab === "cookies" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-900 dark:text-white">
                  <Cookie className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Transparência de Cookies e Armazenamento Local
                </span>
                <p className="text-[11px] leading-relaxed">
                  O Vita4Me adota uma abordagem estrita de privacidade: não utilizamos cookies de rastreamento de anúncios de terceiros nem comercializamos perfis de comportamento.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Cookies Estritamente Necessários</h3>
                <p>
                  Essenciais para o funcionamento da aplicação, como manutenção de sessão de login autenticada via tokens seguros (JWT) e preferências de tema visual (claro/escuro). Não podem ser desativados sem inviabilizar o login no sistema.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Métricas e Telemetria Agregada</h3>
                <p>
                  Utilizamos ferramentas de medição técnica agregada (Google Analytics 4 com anonimização de IP) para avaliar o desempenho das páginas públicas e entender a taxa de conversão da landing page. <strong>Nenhum dado clínico, biomarcador ou exame médico é transmitido através de cookies analíticos.</strong>
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Gerenciamento pelo Usuário</h3>
                <p>
                  Você pode bloquear ou limpar os cookies a qualquer momento através das configurações do seu navegador web.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* Bottom Footer Action */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Entendido e Ciente
          </button>
        </div>

      </div>
    </div>
  );
};
