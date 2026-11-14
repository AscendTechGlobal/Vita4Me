import React from "react";
import { ShieldCheck, Cookie, Stethoscope } from "lucide-react";

export type PublicLegalDocumentId = "privacidade" | "termos" | "cookies";
export type LegalTab = PublicLegalDocumentId | "consentimento";

export interface LegalDocumentMeta {
  id: PublicLegalDocumentId;
  path: string;
  canonicalUrl: string;
  title: string;
  heading: string;
  tabLabel: string;
  description: string;
}

export const LEGAL_DOCUMENT_META: Record<PublicLegalDocumentId, LegalDocumentMeta> = {
  privacidade: {
    id: "privacidade",
    path: "/privacidade",
    canonicalUrl: "https://vita4me.com/privacidade",
    title: "Política de Privacidade (LGPD) | Vita4Me",
    heading: "Política de Privacidade",
    tabLabel: "Política de Privacidade (LGPD)",
    description:
      "Política de Privacidade e conformidade com a LGPD (Lei nº 13.709/2018) para tratamento de dados pessoais e sensíveis de saúde no Vita4Me.",
  },
  termos: {
    id: "termos",
    path: "/termos",
    canonicalUrl: "https://vita4me.com/termos",
    title: "Termos de Uso | Vita4Me",
    heading: "Termos de Uso",
    tabLabel: "Termos de Uso",
    description:
      "Termos de Uso, isenção de responsabilidade médica, planos, assinaturas e política de uso justo da plataforma Vita4Me.",
  },
  cookies: {
    id: "cookies",
    path: "/cookies",
    canonicalUrl: "https://vita4me.com/cookies",
    title: "Política de Cookies | Vita4Me",
    heading: "Política de Cookies",
    tabLabel: "Política de Cookies",
    description:
      "Política de Cookies, tokens essenciais de autenticação e armazenamento local utilizados pelo Vita4Me.",
  },
};

function sanitizeConfiguredValue(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (/configur[aá]vel|placeholder|your-|example|ltda\.?/i.test(trimmed)) return null;
  if (/VITE_/i.test(trimmed)) return null;
  return trimmed;
}

export const LEGAL_PRODUCT_NAME = "Vita4Me";
export const LEGAL_CONTROLLER_NAME = "Luís Eduardo da Silva Weber";
export const DEFAULT_PRIVACY_CONTACT_EMAIL = "privacidade@vita4me.com";
export const LEGAL_DOCUMENT_VERSION = "1.0";
export const LEGAL_LAST_UPDATED_LABEL = `Última atualização: 14 de novembro de 2026 • Versão ${LEGAL_DOCUMENT_VERSION}`;

export function resolveControllerLegalName(): string {
  const envVal =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_CONTROLLER_LEGAL_NAME
      : undefined;
  return sanitizeConfiguredValue(envVal) || LEGAL_CONTROLLER_NAME;
}

export function resolveDpoContactEmail(): string {
  const envVal =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_DPO_EMAIL
      : undefined;
  const cleaned = sanitizeConfiguredValue(envVal);
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return DEFAULT_PRIVACY_CONTACT_EMAIL;
  }
  return cleaned;
}

interface LegalDocumentsContentProps {
  activeTab: PublicLegalDocumentId;
}

export const LegalDocumentsContent: React.FC<LegalDocumentsContentProps> = ({ activeTab }) => {
  const controllerLegalName = resolveControllerLegalName();
  const dpoContactEmail = resolveDpoContactEmail();

  return (
    <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
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
            <p className="text-[10px] opacity-80 pt-1">{LEGAL_LAST_UPDATED_LABEL}</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Identificação do Controlador e Canal de Privacidade
            </h3>
            <p>
              O serviço digital <strong>{LEGAL_PRODUCT_NAME}</strong> tem como controlador responsável pelas decisões referentes ao tratamento dos dados pessoais na plataforma{" "}
              <strong>{controllerLegalName}</strong>.
            </p>
            <p>
              Atualmente, o {LEGAL_PRODUCT_NAME} opera sob responsabilidade do controlador pessoa física acima identificado, sem pessoa jurídica ou CNPJ formalmente constituídos; caso uma pessoa jurídica venha a ser formalizada no futuro, estes documentos legais serão devidamente atualizados.
            </p>
            <p>
              O atendimento a solicitações de privacidade e exercício de direitos do titular (LGPD) é realizado pelo canal oficial:{" "}
              <a
                href={`mailto:${dpoContactEmail}`}
                className="font-mono text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {dpoContactEmail}
              </a>
              , bem como diretamente na área autenticada da conta em <em>Configurações &rarr; Privacidade</em>.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Categorias de Dados Coletados
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Dados Cadastrais e de Acesso:</strong> Nome completo, endereço de e-mail e hash criptográfico de senha para criação e autenticação de conta.
              </li>
              <li>
                <strong>Dados Pessoais Sensíveis de Saúde:</strong> Exames laboratoriais, valores de biomarcadores, dosagens de medicamentos em uso, datas de medição e arquivos de laudos médicos submetidos voluntariamente pelo usuário.
              </li>
              <li>
                <strong>Dados de Dependentes (Plano Família):</strong> Informações inseridas pelo titular sobre dependentes familiares (nome, data de nascimento e exames), sob declaração de legitimidade legal/familiar do titular.
              </li>
              <li>
                <strong>Dados Financeiros e de Cobrança:</strong> As transações são processadas com tokenização externa pelos gateways de pagamento integrados (<strong>Asaas</strong> no Brasil, via Pix e cartão nacional, e <strong>Stripe</strong> para pagamentos internacionais). O Vita4Me não armazena dados completos de cartão de crédito em seus servidores.
              </li>
              <li>
                <strong>Dados Técnicos Operacionais:</strong> Logs operacionais essenciais de segurança e requisições HTTP, sem exposição de conteúdo clínico sensível ou venda de perfil comportamental.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Finalidades e Bases Legais do Tratamento
            </h3>
            <div className="space-y-2">
              <p>
                <strong>A. Prestação dos Serviços de Prontuário Pessoal (Art. 7º, V da LGPD):</strong> Armazenar e organizar o histórico de saúde para consulta pelo próprio titular.
              </p>
              <p>
                <strong>B. Tradução Didática por Inteligência Artificial (Art. 11, I da LGPD):</strong> O tratamento de dados clínicos sensíveis para geração de explicações em linguagem simples e resumos de laudos é realizado mediante{" "}
                <em>consentimento específico, destacado e informado</em> do usuário.
              </p>
              <p>
                <strong>C. Cumprimento de Obrigações Legais e Fiscais (Art. 7º, II da LGPD):</strong> Guarda de registros financeiros e fiscais pelo prazo exigido pela legislação tributária brasileira.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              4. Operadores e Suboperadores de Dados
            </h3>
            <p>
              O Vita4Me <strong>nunca comercializa ou compartilha dados pessoais de saúde</strong> para publicidade ou terceiros não autorizados. O compartilhamento ocorre estritamente com operadores essenciais à operação técnica do serviço em produção:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Supabase:</strong> Infraestrutura de banco de dados PostgreSQL com Row Level Security (RLS), autenticação e armazenamento seguro de arquivos em nuvem.
              </li>
              <li>
                <strong>Google Cloud (Cloud Run e Gemini API):</strong> Hospedagem da aplicação em nuvem e processamento efêmero de leitura óptica (OCR) e tradução didática de laudos via inteligência artificial, sem utilização dos dados enviados para treinamento de modelos públicos.
              </li>
              <li>
                <strong>Stripe:</strong> Processamento seguro de pagamentos internacionais e gestão de assinaturas recorrentes com conformidade PCI-DSS.
              </li>
              <li>
                <strong>Asaas:</strong> Processamento seguro de pagamentos nacionais no Brasil (Pix e cartão de crédito) e gestão de cobranças recorrentes.
              </li>
              <li>
                <strong>Resend:</strong> Envio autenticado de e-mails transacionais de confirmação de conta, recuperação de senha, boas-vindas e avisos operacionais.
              </li>
              <li>
                <strong>Cloudflare:</strong> Proteção de borda, DNS, mitigação de tráfego malicioso e criptografia em trânsito (SSL/TLS) para o domínio <code className="text-emerald-700 dark:text-emerald-400">vita4me.com</code>.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              5. Direitos do Titular (Art. 18 da LGPD)
            </h3>
            <p>
              Você pode a qualquer momento exercer seus direitos garantidos pela LGPD, incluindo: confirmação de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, portabilidade via exportação em PDF e exclusão definitiva da conta.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              6. Política de Exclusão e Retenção de Dados
            </h3>
            <p>
              Ao solicitar a exclusão de sua conta através de{" "}
              <em>Configurações &rarr; Privacidade &rarr; Excluir Minha Conta</em>, o sistema executa a eliminação física imediata de seus exames, registros clínicos, dependentes e arquivos do armazenamento ativo. Cópias residuais em backups automatizados de segurança são expurgadas conforme o ciclo natural de retenção da infraestrutura (até 30 dias), sem qualquer reativação ou tratamento ativo. Registros fiscais de faturamento são mantidos estritamente pelo prazo exigido pela legislação tributária aplicável.
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
              O Vita4Me é uma ferramenta de letramento em saúde e organização pessoal.{" "}
              <strong>Não substitui consultas, pareceres ou diagnósticos médicos profissionais.</strong>{" "}
              Em caso de urgência ou emergência, procure imediatamente o pronto-socorro mais próximo.
            </p>
            <p className="text-[10px] opacity-80 pt-1">{LEGAL_LAST_UPDATED_LABEL}</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Objeto e Natureza do Serviço
            </h3>
            <p>
              O Vita4Me disponibiliza uma plataforma web para centralização de exames, acompanhamento de indicadores clínicos, controle de horários de medicação e geração de dossiês médicos para apoio ao paciente durante suas consultas com profissionais de saúde habilitados.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Limites da Inteligência Artificial
            </h3>
            <p>
              As explicações, traduções de termos laboratoriais e resumos fornecidos pelos recursos de inteligência artificial possuem caráter exclusivamente educativo e informativo. A IA não realiza consultas médicas autônomas, não prescreve terapias e não garante 100% de precisão sobre laudos complexos ou atípicos.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Gestão de Dependentes (Plano Família)
            </h3>
            <p>
              Ao cadastrar dependentes no Vita4Me Família, o titular declara e garante que possui autorização legítima ou representação legal (como pátrio poder no caso de filhos menores de idade ou procuração legal para dependentes idosos) para incluir e gerenciar os respectivos dados clínicos.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              4. Planos, Assinaturas e Teste Grátis de 7 Dias
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Período de Teste Grátis:</strong> Novos assinantes dos planos Individual ou Família contam com 7 dias corridos de teste gratuito a partir da assinatura. O cancelamento pode ser efetuado a qualquer momento sem cobrança durante esse período.
              </li>
              <li>
                <strong>Cobrança e Renovação:</strong> Após o trial, o valor correspondente ao plano e periodicidade escolhidos (mensal ou anual) é cobrado de forma automática e recorrente até o cancelamento.
              </li>
              <li>
                <strong>Cancelamento Simples:</strong> O cancelamento pode ser solicitado a qualquer momento pelo usuário na área da assinatura ou pelo portal do gateway utilizado na contratação (Asaas ou Stripe), mantendo-se o acesso ativo até o término do ciclo já faturado.
              </li>
              <li>
                <strong>Direito de Arrependimento:</strong> É garantido o direito de arrependimento em até 7 dias da primeira cobrança, nos termos do Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              5. Uso Permitido e Proibições
            </h3>
            <p>
              É estritamente vedado utilizar o Vita4Me para fins ilícitos, tentar violar a segurança da plataforma, fraudar identidades, realizar engenharia reversa ou carregar conteúdo que viole direitos de propriedade intelectual ou sigilo de terceiros.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              6. Política de Uso Justo dos Recursos de Inteligência Artificial
            </h3>
            <p>
              Os recursos de inteligência artificial estão incluídos nos planos pagos do Vita4Me e destinam-se ao uso pessoal e familiar compatível com a finalidade da plataforma. Para preservar a disponibilidade, segurança e qualidade do serviço, o Vita4Me poderá aplicar limites técnicos temporários em situações de uso automatizado, abusivo, anormal ou incompatível com a utilização regular da plataforma.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              A plataforma emprega mecanismos de limitação de taxa, proteções antiabuso e controles técnicos de segurança para prevenir extração automatizada de dados, scraping ou chamadas excessivas em rajada.
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
            <p className="text-[10px] opacity-80 pt-1">{LEGAL_LAST_UPDATED_LABEL}</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Cookies e Armazenamento Estritamente Necessários
            </h3>
            <p>
              Essenciais para o funcionamento da aplicação, como manutenção segura da sessão autenticada via tokens temporários (JWT) no armazenamento de sessão do navegador (<code className="text-emerald-700 dark:text-emerald-400">sessionStorage</code>) e preferências de interface, como tema visual (claro/escuro) e idioma. Não podem ser desativados sem inviabilizar o login e a segurança da sessão.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Métricas e Telemetria Agregada
            </h3>
            <p>
              Não utilizamos cookies de publicidade comportamental de terceiros. Ferramentas de medição técnica agregada (como Google Analytics 4 com anonimização de IP) permanecem desativadas por padrão e somente operam se explicitamente habilitadas no ambiente de produção para métricas gerais das páginas públicas.{" "}
              <strong>Nenhum dado clínico, biomarcador ou exame médico é transmitido através de cookies analíticos.</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Gerenciamento pelo Usuário
            </h3>
            <p>
              Você pode bloquear ou limpar os cookies e dados de armazenamento do navegador a qualquer momento através das configurações do seu navegador web.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
