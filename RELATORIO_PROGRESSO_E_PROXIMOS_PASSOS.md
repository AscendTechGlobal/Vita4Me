# 📋 Vita4Me — Relatório de Atividades, Histórico & Manual Passo a Passo de Engenharia
**Última Atualização:** 16/10/2026  
**Status do Projeto:** ✅ Estável, Compilação Zero Erros (`npx tsc --noEmit` e `npm run build`), Deploy Contínuo Ativo no Google Cloud Run  
**Ambiente em Produção:** `https://vita4me-306188844103.southamerica-east1.run.app`

---

## 🎯 1. Histórico de Entregas & Marcos Técnicos

### 🗂️ 1.1 Arquitetura da "Gaveta de Exames" & Cofre Persistente de Documentos (13/10/2026 — `server.ts`)
* **Premissa Central do Produto:** O paciente e seu médico têm acesso garantido ao documento original (PDF, laudo impresso, foto) a qualquer momento, sem risco de perda.
* **Cofre Seguro Local (`data/medical-documents/`):**
  * Implementada persistência local isolada por usuário (`{userId}/exams/{uuid}_{filename}`) com proteção estrita contra Path Traversal e sanitização rigorosa de nomes de arquivo.
  * O arquivo original é salvo imediatamente no cofre do servidor, servindo como backup resiliente e operando perfeitamente mesmo se o storage em nuvem estiver em transição ou sem credenciais administrativas.
  * Espelhamento automático de upload para o bucket privado `medical-documents` do Supabase Storage.
* **Geração Resiliente de Links Seguros (`/api/exams/signed-url`):**
  * Dupla verificação de disponibilidade: prioriza a nuvem se ativa; se o bucket da nuvem não estiver provisionado, gera instantaneamente um link temporário seguro assinado com **HMAC SHA-256** e expiração de 15 minutos.
* **Endpoint de Visualização Inline (`/api/exams/view-document`):**
  * Rota dedicada que valida o token HMAC, checa expiração temporal e serve o arquivo diretamente no navegador com cabeçalhos `Content-Disposition: inline` e MIME real (`application/pdf`, `image/png`, `image/jpeg`).
  * O botão **"Abrir Arquivo Original"** no modal de visualização de exames abre o PDF original completo em uma nova aba do navegador com um clique.

---

### 🧬 1.2 Resolução de OCR Multi-Laudo & Array JSON do Gemini (13/10/2026 — `server.ts`)
* **Causa Raiz Identificada:** O laudo de teste possui **duas páginas com duas datas de coleta distintas** (Página 1: `12/03/2026` e Página 2: `18/08/2026`). O Gemini 2.5 Flash identificou ambos os laudos e retornou um **Array JSON com 2 objetos** (`[{...}, {...}]`). O backend esperava um objeto único, o que fazia com que `parsed.title` e `parsed.ai_key_findings` resultassem em `undefined`, acionando os fallbacks vazios (0 marcadores).
* **Solução Implementada:**
  * **Parser Resiliente:** Atualizado o extrator `extractJsonFromText` para reconhecer estruturas delimitadas por colchetes `[...]` além de chaves `{...}`.
  * **Regra Clínica de Ouro Automática:** Ao detectar múltiplos laudos no mesmo arquivo, o sistema ordena as coletas cronologicamente de forma decrescente e seleciona a mais recente (`18/08/2026`), garantindo que o prontuário reflita a condição clínica atual.
  * **Normalização Completa de Biomarcadores:** Mapeamento resiliente de todos os **16 biomarcadores** (Hemoglobina, Hematócrito, Leucócitos, Plaquetas, Glicose em jejum, HbA1c, Colesterol total, HDL, LDL, Triglicerídeos, Creatinina, Ureia, TGO, TGP, TSH e Vitamina D), com tradução de status (`normal`, `altered`, `attention`), intervalos e explicações didáticas.
  * **Extração Cadastral Perfeita:** Identificação automática de `LABORATORIO VIDA`, `Dr(a). Teste - CRM 000000` e data de coleta `2026-08-18`.

---

### 📊 1.3 Validação Ponta a Ponta do Fluxo de Exames (`ExamsCentralView.tsx`)
* **Ciclo Completo Testado e Operacional:**
  1. Upload do PDF de teste via drag & drop.
  2. Extração pelo Gemini 2.5 Flash e pré-preenchimento automático da tela de revisão humana.
  3. Confirmação e salvamento no prontuário.
  4. Visualização do laudo e abertura do documento PDF original em nova aba.
  5. Sincronização dos biomarcadores com os cards do **Dashboard 360°** (Glicemia de Jejum, Colesterol LDL, Vitamina D).

---

### 👥 1.4 Gaveta de Exames Multi-Familiar & Isolamento Clínico (`ExamsCentralView.tsx`)
* **Garantia Arquitetural do Titular:** Implementado `titularMember` como âncora principal em `AppLayout.tsx`. O usuário titular agora sempre aparece como primeiro perfil protegido, com alternância bidirecional contínua entre titular e dependentes.
* **Filtros Multi-Familiares na Central de Exames:**
  * Barra de filtros dinâmica com contadores por membro (`Todos da Família (N)`, `Titular (N)`, `Filho(a) (N)`).
  * Isolamento estrito de visualização: exames vinculados a um dependente são filtrados sem poluir o prontuário dos demais membros.
* **Badges de Identificação por Cartão:** Cada exame exibe visualmente o nome e parentesco do familiar (`👤 Titular`, `👶 Pedro (Filho)`).
* **Seletor de Vínculo nos Modais de Cadastro (Upload & Manual):** Tanto no fluxo de revisão assistida por IA quanto no cadastro manual, o usuário pode selecionar a qual membro da família pertence o exame antes de salvar.
* **Proteção de Integridade UUID no Supabase (`healthStorage.ts`):**
  * Tratamento do identificador virtual `'fam-me'` para `null` no banco de dados, eliminando falhas de sintaxe em colunas `uuid references family_members(id)`.
  * Sincronização e herança do `family_member_id` para biomarcadores e indicadores clínicos derivados do exame.
* **Isolamento de Métricas no Dashboard 360° (`DashboardView.tsx`):** Ao alternar o perfil ativo na Navbar, os indicadores e exames recentes passam a refletir exclusivamente a saúde do membro selecionado.

---

### 🔐 1.5 Arquitetura de Login Social com Google & Suporte a Avatar (14/10/2026)
* **Nova Migração Supabase (`20261014_google_auth_and_avatar.sql`):**
  * Adicionada a coluna `avatar_url` na tabela `public.profiles`.
  * Atualizada a trigger `handle_new_user()` para extrair automaticamente metadados do Google (`full_name` ou `name`, e `avatar_url` ou `picture`).
  * Atualização idempotente via `on conflict (id) do update`.
* **Fluxo de Confirmação Aprimorado (`AuthConfirmView.tsx`):**
  * Auto-redirecionamento inteligente para `/app` quando uma sessão ativa for detectada pelo SDK (eliminando cliques redundantes após o retorno do OAuth do Google).
  * Botões de "Continuar com Google" e "Cadastrar com Google" validados e operacionais em `/login` e `/cadastro`.

---

### 🌐 1.6 Internacionalização Global (i18n) e Dossiê PDF Multilíngue (16/10/2026)
* **Ecossistema 100% Reativo em 3 Línguas:**
  * Português (`pt`), Inglês (`en`), Espanhol (`es`).
  * Cobertura de 100% das visões da plataforma: Navbar, Sidebar, Dashboard 360°, Central de Exames, Medicamentos, Indicadores Clínicos, Linha do Tempo Médica, Rotina Diária, Assistente IA, Landing Page, Modais de Billing e Dossiê Médico em PDF.
* **Dossiê PDF Clínico Multilíngue (`ExportDossierModal.tsx`):**
  * Renderização com `html2canvas` + `jsPDF` em formato A4.
  * Todas as tabelas, colunas clínicas, faixas de referência, termos médicos e rodapés legais adaptados dinamicamente para o idioma ativo.

---

## 📘 2. MANUAL PASSO A PASSO (PLAYBOOK DE ARQUITETURA PARA OS PRÓXIMOS SAAS)

> **Finalidade:** Este guia serve como padrão de engenharia oficial para replicar internacionalização (i18n), multi-moeda, cofre seguro de documentos, autenticação Google e relatórios PDF nos próximos projetos SaaS da Ascend Tech Global.

---

### 🛠️ MANUAL 1: Internacionalização Completa (i18n Nativo sem Libs Pesadas)

Para evitar dependências pesadas, bloatware no bundle ou problemas de hidratação SSR, usamos um padrão baseado em **React Context + TypeScript Strict + Dicionários Modulares**.

#### Passo 1: Definir os Tipos e a Interface Central (`src/i18n/types.ts`)
```typescript
export type Language = 'pt' | 'en' | 'es';

export interface TranslationDictionary {
  common: {
    back: string;
    cancel: string;
    save: string;
    loading: string;
    // ...
  };
  nav: {
    overview: string;
    settings: string;
    logout: string;
  };
  dashboard: {
    heroTitle: string;
    heroSubtitle: string;
  };
  // Adicionar nós modulares por feature/tela
}
```

#### Passo 2: Criar os Dicionários de Idioma (`src/i18n/locales/*.ts`)
* `src/i18n/locales/pt.ts`
* `src/i18n/locales/en.ts`
* `src/i18n/locales/es.ts`
Cada arquivo deve implementar `TranslationDictionary` rigorosamente. O TypeScript acusará erro imediato caso alguma chave seja esquecida em qualquer um dos idiomas.

#### Passo 3: Criar o Contexto Reativo (`src/contexts/LanguageContext.tsx`)
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationDictionary } from '../i18n/types';
import { pt } from '../i18n/locales/pt';
import { en } from '../i18n/locales/en';
import { es } from '../i18n/locales/es';

const dictionaries: Record<Language, TranslationDictionary> = { pt, en, es };

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  dictionary: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dictionary: dictionaries[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  return context;
};
```

#### Passo 4: Criar o Seletor Visual (`src/components/LanguageSelector.tsx`)
* Criar um componente com opções de bandeira (ex: 🇧🇷 PT, 🇺🇸 EN, 🇪🇸 ES).
* Posicionar no Navbar ou no rodapé.
* Chamar `setLanguage('en')` ao clicar.

#### Passo 5: Formatação de Datas e Números por Localidade
Sempre vincular o `localeStr` ao idioma ativo:
```typescript
const { language, dictionary } = useLanguage();
const localeStr = language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : 'pt-BR');

// Para datas:
new Date(dateString).toLocaleDateString(localeStr);

// Para moedas/números:
new Intl.NumberFormat(localeStr, { style: 'currency', currency: language === 'pt' ? 'BRL' : 'USD' }).format(val);
```

---

### 💳 MANUAL 2: Precificação Internacional & Multi-Moeda (BRL / USD)

#### A Regra de Ouro da Conversão:
> **Nunca use conversão de câmbio volátil em tempo real no carrinho do cliente internacional!**  
> Se o cliente vê R$ 29,90 e no cartão dele é cobrado um valor que flutua a cada segundo (US$ 5,31 hoje, US$ 5,45 amanhã), isso gera desconfiança, sensação de insegurança e atrito no suporte.

#### Passo a Passo de Implementação:
1. **Defina Preços Fixos por Mercado:**
   * **Brasil (BRL):** R$ 29,90/mês ou R$ 299/ano (Plano Individual) | R$ 59,90/mês ou R$ 599/ano (Plano Família).
   * **Exterior (USD):** US$ 9.90/mês ou US$ 99/ano (Individual) | US$ 19.90/mês ou US$ 199/ano (Família).
2. **Separação de Provedores de Pagamento:**
   * **Cliente no Brasil:** Direcionar para gateway nacional (Asaas) via **Pix Instantâneo** ou Cartão em Reais.
   * **Cliente no Exterior:** Direcionar para gateway global (**Stripe Checkout Session**) com valor fixo em Dólar (`currency: 'usd'`).
3. **Alternância no Modal de Assinatura (`BillingModal.tsx`):**
   * Oferecer tabs ou botões: `🇧🇷 Brasil (Pix / Cartão)` e `🌎 Internacional (Stripe / USD)`.
   * Se o usuário estiver no idioma `en` ou `es`, pré-selecionar automaticamente a aba Internacional.

---

### 📄 MANUAL 3: Geração de Relatórios e Dossiês em PDF no Frontend

Usamos o padrão `html2canvas` + `jsPDF` renderizando uma folha oculta ou preview estilizado em Tailwind.

#### Passo a Passo:
1. **Container com ID Único:**
   Criar a folha A4 com largura fixa (`max-w-3xl`) e fundo branco `#ffffff`:
   ```tsx
   <div id="printable-dossier" className="bg-white text-slate-900 p-8 rounded-2xl">
     {/* Conteúdo traduzido usando dictionary */}
   </div>
   ```
2. **Função de Exportação Vetorial/Gráfica:**
   ```typescript
   const handleDownloadPDF = async () => {
     const docElement = document.getElementById("printable-dossier");
     if (!docElement) return;

     const canvas = await html2canvas(docElement, {
       scale: 2, // Maior nitidez
       useCORS: true,
       backgroundColor: '#ffffff',
     });

     const imgData = canvas.toDataURL("image/jpeg", 0.95);
     const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
     const pageWidth = pdf.internal.pageSize.getWidth();
     const pageHeight = pdf.internal.pageSize.getHeight();
     const imgHeight = (canvas.height * pageWidth) / canvas.width;

     let heightLeft = imgHeight;
     let position = 0;

     pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
     heightLeft -= pageHeight;

     while (heightLeft > 0) {
       position = heightLeft - imgHeight;
       pdf.addPage();
       pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
       heightLeft -= pageHeight;
     }

     pdf.save(`Dossie_${Date.now()}.pdf`);
   };
   ```
3. **Quebra de Página sem Cortar Tabelas:**
   Utilizar a classe CSS `page-break-inside-avoid` nos blocos de cards e tabelas.

---

### 🔐 MANUAL 4: Google OAuth Social Login & Avatar no Supabase

#### Passo a Passo de Configuração:
1. **Google Cloud Console:**
   * Criar Credenciais OAuth 2.0.
   * Adicionar URI de redirecionamento: `https://<PROJECT-ID>.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard:**
   * Em *Authentication > Providers > Google*, ativar e inserir `Client ID` e `Client Secret`.
3. **Trigger de Extração de Metadados (SQL):**
   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, email, full_name, avatar_url, updated_at)
     values (
       new.id,
       new.email,
       coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
       coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
       now()
     )
     on conflict (id) do update set
       avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
       full_name = case when profiles.full_name is null or profiles.full_name = '' then excluded.full_name else profiles.full_name end,
       updated_at = now();
     return new;
   end;
   $$ language plpgsql security definer;
   ```
4. **Chamada no Frontend:**
   ```typescript
   supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/confirm` }
   });
   ```

---

### ☁️ MANUAL 5: Deploy Contínuo no Google Cloud Run via Cloud Build

#### Passo a Passo de Infraestrutura:
1. **Arquivo `Dockerfile` Otimizado (Multi-Stage):**
   * Stage 1: Build da aplicação React/Vite com Node.js e bundle do backend (`dist/server.cjs`).
   * Stage 2: Runtime leve com `node:20-alpine`, expondo a porta `8080`.
2. **Gatilho no Cloud Build:**
   * Conectado ao repositório GitHub na branch `main`.
   * Comando de substituição: `--platform managed --region southamerica-east1`.
3. **Deploy Automatizado:**
   * Todo `git push origin main` dispara automaticamente o Cloud Build, gerando nova imagem no Artifact Registry e atualizando o tráfego do Cloud Run sem downtime.

---

## 🚀 3. Próximos Passos Imediatos para o Vita4Me

### 💳 1. Gateway Asaas & Stripe (Produção Real)
- [ ] Obter chave de API de produção (`ASAAS_API_KEY`) no painel do Asaas.
- [ ] Adicionar `ASAAS_API_KEY` nas variáveis de ambiente do Cloud Run.
- [ ] Desativar `isSimulationMode` em `src/server/billing/billingService.ts` para habilitar Pix real.
- [ ] Configurar o webhook do Asaas apontando para `https://vita4me-306188844103.southamerica-east1.run.app/api/webhooks/asaas`.
- [ ] Configurar chaves de produção da Stripe para o checkout internacional em Dólar.

---

## 🛠️ Comandos Rápidos de Referência

```bash
# Iniciar o servidor de desenvolvimento (Express + Vite)
npm run dev

# Checagem de tipagem TypeScript (zero erros)
npx tsc --noEmit

# Validar build de produção
npm run build

# Enviar melhorias para o GitHub e disparar Cloud Run
git add .
git commit -m "feat: descrição da melhoria"
git push origin main
```
