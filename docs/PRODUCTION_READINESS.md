# 🚀 Vita4Me — Relatório Consolidado de Production Readiness & Go-Live

> **Status Geral do Projeto:** `🟡 CODE READY — CONFIGURAÇÃO DE PRODUÇÃO PENDENTE`  
> **Data da Auditoria Final:** 20 de Agosto de 2026  
> **Versão:** 1.0.0 (Hardened Build)

---

## 📊 1. Matriz de Variáveis de Ambiente de Produção

Todas as variáveis devem ser provisionadas no gerenciador seguro de segredos da plataforma de hospedagem (Vercel / Railway / Cloudflare). **Nenhum valor real deve ser commitado no repositório.**

| Variável | Escopo | Obrigatória | Serviço / Provedor | Descrição / Finalidade |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend & Backend | **SIM** | Supabase | URL da API REST/GraphQL do projeto Supabase de produção. |
| `VITE_SUPABASE_ANON_KEY` | Frontend & Backend | **SIM** | Supabase | Chave pública anônima com restrição estrita via Row Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY`| Backend Only | **SIM** | Supabase | Chave de serviço com privilégios de bypass RLS (uso exclusivo em webhooks e admin). |
| `STRIPE_SECRET_KEY` | Backend Only | **SIM** | Stripe | Chave de API secreta (`sk_live_...`) para criação de checkout e customer portal. |
| `VITE_STRIPE_PUBLIC_KEY` | Frontend | **SIM** | Stripe | Chave publicável (`pk_live_...`) para tokenização e checkout client-side. |
| `STRIPE_WEBHOOK_SECRET` | Backend Only | **SIM** | Stripe | Assinatura de webhook (`whsec_...`) para validação criptográfica de payloads. |
| `GEMINI_API_KEY` | Backend Only | **SIM** | Google Cloud | Chave de API da família Gemini 2.5 Flash para OCR e tradução didática. |
| `VITE_GA_MEASUREMENT_ID` | Frontend | RECOMENDADA | Google Analytics 4 | Identificador de medição (`G-XXXXXXXXXX`) para analytics sem dados clínicos. |
| `VITE_SENTRY_DSN` | Frontend | RECOMENDADA | Sentry | DSN para captura sanitizada de exceções no React / DOM. |
| `SENTRY_DSN` | Backend | RECOMENDADA | Sentry | DSN para rastreamento de erros no Express / Node.js. |
| `APP_URL` | Backend Only | **SIM** | Infraestrutura | URL base canônica (`https://vita4me.app`). |
| `PORT` | Backend Only | **SIM** | Servidor | Porta de escuta da aplicação Node.js (padrão: `3000`). |
| `NODE_ENV` | Backend Only | **SIM** | Servidor | Ambiente de execução (`production`). |

---

## 🔴 2. BLOQUEADORES / OBRIGATÓRIOS ANTES DO DEPLOY (Ações Operacionais)

Os itens abaixo são exclusivamente de **configuração em painéis externos e provisionamento de chaves reais**, uma vez que todo o código-fonte está 100% finalizado e validado.

| Item | Tipo | Status | Ação Requerida |
|---|---|---|---|
| **Supabase Project** | Configuração Externa | 🔴 PENDENTE | Provisionar projeto de produção no Supabase, executar `schema.sql` + `migrations/` e confirmar RLS ativo em 100% das tabelas. |
| **Supabase Backups & Storage** | Configuração Externa | 🔴 PENDENTE | Habilitar backups automatizados diários no painel do Supabase e criar o bucket `medical-documents` privado com RLS. |
| **Stripe Live Mode** | Configuração Externa | 🔴 PENDENTE | Ativar conta Stripe em Live Mode, criar produtos/preços correspondentes (Individual R$ 29/mês e Família R$ 59/mês) e habilitar o Customer Portal no Stripe Dashboard. |
| **Stripe Webhook Live** | Configuração Externa | 🔴 PENDENTE | Cadastrar o endpoint `https://vita4me.app/api/stripe/webhook` no Stripe com os eventos auditados e injetar o `STRIPE_WEBHOOK_SECRET` de produção. |
| **Google Gemini API Key** | Configuração Externa | 🔴 PENDENTE | Obter chave de API de produção no Google AI Studio / Google Cloud Vertex AI com faturamento habilitado e cotas adequadas. |
| **Domínio Oficial & DNS** | Infraestrutura | 🔴 PENDENTE | Apontar o domínio `vita4me.app` no registrador DNS com registros A/CNAME e validar certificado SSL/HTTPS. |
| **Dados Legais do Controlador** | Governança | 🔴 PENDENTE | Preencher a Razão Social e CNPJ definitivos nos documentos legais e criar a caixa postal oficial de privacidade (`privacidade@vita4me.app`). |

---

## 🟡 3. RECOMENDADO ANTES OU LOGO APÓS O LANÇAMENTO

| Item | Área | Status | Ação Sugerida |
|---|---|---|---|
| **Google Search Console** | SEO | Recomendado | Verificar propriedade no Google Search Console e submeter `https://vita4me.app/sitemap.xml`. |
| **Bing Webmaster Tools** | SEO | Recomendado | Importar sitemap no Bing Webmaster Tools. |
| **Social Banner (OG Image 1200×630)** | SEO / Social | Recomendado | Criar banner estilizado de 1200×630px para compartilhamento no WhatsApp/LinkedIn. |
| **Sentry Project Provisioning** | Observabilidade | Recomendado | Criar projeto no Sentry e configurar alertas de e-mail/Slack para erros com taxa anormal. |
| **Revisão Jurídica Externa** | Compliance | Recomendado | Submeter minutas de Termos e Privacidade a parecer de assessoria jurídica especializada em Direito Médico/Digital. |

---

## 🔵 4. PÓS-LANÇAMENTO / ESCALA (Não Bloqueadores)

1. **Service Worker / PWA Offline:** Adicionar capacidade offline para consulta de medicamentos e exames sem conexão ativa.
2. **GTM Server-Side & CMP Internacional:** Implementar Consent Management Platform (CMP) avançada caso haja expansão para mercados europeus (GDPR) ou americanos (HIPAA).
3. **Point-in-Time Recovery (PITR) de Segundos:** Habilitar PITR contínuo no Supabase Pro após atingir primeiros 1.000 usuários ativos.
4. **Virtualização de Listas de Exames:** Introduzir `react-window` quando usuários acumularem mais de 200 exames históricos.
5. **Replicação Cross-Region do Storage:** Configurar replicação redundante de PDFs para bucket S3 secundário (AWS ou Cloudflare R2).

---

## ✅ 5. Checklist Operacional de Go-Live

```text
[ ] 1. Projeto Supabase de produção provisionado
[ ] 2. Arquivo schema.sql e migration 20260820_security_hardening.sql executados
[ ] 3. RLS e funções SECURITY DEFINER validadas no PostgreSQL
[ ] 4. Bucket "medical-documents" criado no Supabase Storage com RLS restrita
[ ] 5. Backups diários confirmados no painel do Supabase
[ ] 6. Stripe Live Mode ativado com produtos Individual e Família
[ ] 7. Stripe Customer Portal ativado no Stripe Dashboard
[ ] 8. Stripe Webhook cadastrado apontando para https://vita4me.app/api/stripe/webhook
[ ] 9. Variáveis de ambiente provisionadas no Host de Produção
[ ] 10. Domínio vita4me.app apontado e certificado HTTPS ativo
[ ] 11. E-mail oficial de privacidade (privacidade@vita4me.app) configurado
[ ] 12. Deploy de produção executado com sucesso (npm run build)
[ ] 13. Smoke Test de produção executado e aprovado
```

---

## 🧪 6. Roteiro de Smoke Test Pós-Deploy (Contas Controladas Fictícias)

Executar imediatamente após o deploy em produção utilizando dados fictícios:

1. **Acesso à Landing Page:** Acessar `https://vita4me.app/` e verificar carregamento visual, certificado SSL verde e responsividade mobile.
2. **Healthchecks:**
   ```bash
   curl -i https://vita4me.app/health
   curl -i https://vita4me.app/ready
   ```
   *Ambos devem retornar status `200 OK` e `database: "connected"`.*
3. **Criação de Conta:** Cadastrar novo usuário teste marcando os dois checkboxes de consentimento obrigatórios (Termos e LGPD Art. 11, I).
4. **Onboarding:** Preencher o questionário de anamnese inicial e salvar.
5. **Inclusão de Exame Fictício:** Inserir exame manual (ex: Hemograma com valor 14.5 g/dL) e verificar gravação no PostgreSQL.
6. **Upload de Documento Fictício:** Submeter PDF teste e validar geração de signed URL do Supabase Storage.
7. **Tradução com Gemini:** Acionar explicação didática do exame e conferir resposta estruturada com disclaimer de responsabilidade médica.
8. **Limite Free / Paywall:** Consumir créditos da modalidade gratuita e verificar acionamento do paywall de upgrade.
9. **Stripe Checkout:** Iniciar checkout de teste, validar redirecionamento seguro para a página de pagamento do Stripe e retorno à aplicação.
10. **Customer Portal:** Abrir o Portal do Cliente Stripe via *Configurações &rarr; Gerenciar Faturamento* e verificar carregamento da sessão.
11. **Dossiê PDF:** Gerar PDF do prontuário em *Exportar Dossiê Médico* e validar layout e dados do documento.
12. **Exclusão de Conta (LGPD Art. 18):** Executar exclusão da conta de teste em *Configurações &rarr; Privacidade &rarr; Excluir Minha Conta* e verificar expurgo completo de dados e arquivos.

---

## 🔄 7. Procedimento de Rollback Imediato

Se uma anomalia crítica for detectada no Smoke Test:
1. No painel de hospedagem, acionar **Instant Rollback** para o deployment anterior.
2. Em caso de necessidade de reverter commit no repositório:
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
3. Testar `/health` e `/ready` para atestar restabelecimento do serviço.

---

## 👥 8. Responsabilidade Operacional

* **Responsável Técnico / DevOps:** Engenheiro / Administrador de Infraestrutura do Vita4Me.
* **Escalação de Incidentes:** Sentry Alerts &rarr; Administrador Técnico &rarr; Supabase / Stripe Status Dashboards.
