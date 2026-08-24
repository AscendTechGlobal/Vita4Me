# 🛡️ Vita4Me — Plano de Backup, Disaster Recovery (DR) & Continuidade Operacional

> **Objetivo Operacional:** Garantir que o Vita4Me possa ser restaurado de maneira rápida, previsível e sem perda permanente de dados em caso de falha de infraestrutura, exclusão acidental, corrupção de banco de dados, deploy defeituoso ou indisponibilidade de provedores externos.

---

## 📌 1. Classificação das Fontes da Verdade & Componentes

| Componente | Conteúdo / Ativos | Provedor / Repositório | Fonte da Verdade Primária | Estratégia de Proteção |
|---|---|---|---|---|
| **Código & Build** | Frontend React (SPA), Servidor Express, Docker, configs | Repositório Git (GitHub / GitLab) | **Git Repository** | Versionamento em branches protegidas, tags semânticas e CI/CD. |
| **Banco de Dados** | `profiles`, `exams`, `indicators`, `medications`, `records`, `habits`, `family_members`, `stripe_webhook_events` | Supabase PostgreSQL | **PostgreSQL (Supabase)** | Backup nativo diário + WAL / Point-in-Time Recovery (PITR). |
| **Storage de Arquivos** | PDFs de laudos, imagens de exames no bucket `medical-documents` | Supabase Storage (S3-compatible) | **Supabase Storage** | Backup diário de snapshots / replicação de storage. |
| **Autenticação** | Contas, hashes de senhas, JWT tokens (`auth.users`) | Supabase Auth | **Supabase Auth** | Backup sincronizado com o PostgreSQL. |
| **Assinaturas & Faturamento** | Planos, clientes, faturas, status de trial e histórico financeiro | Stripe Inc. | **Stripe** | Stripe Cloud (PCI-DSS Nível 1 com multi-datacenter). |
| **Variáveis de Ambiente** | Chaves de API, Service Roles, Secrets do Stripe e Gemini | Ambiente seguro do Host (Vercel / Railway / Cloudflare) | **Hosting Environment Secrets** | Gestão de segredos com criptografia em repouso e sem commits no Git. |

---

## 🎯 2. Metas de Continuidade: RPO & RTO

* **RPO (*Recovery Point Objective*): $\le 24$ horas**
  * Em caso de perda catastrófica do banco, o volume máximo de dados aceitável a ser reconstituído é de no máximo 24 horas (ou $\le 1$ hora quando o PITR estiver ativo no plano Pro do Supabase).
* **RTO (*Recovery Time Objective*): $\le 4$ horas**
  * Tempo máximo estipulado para reconstrução completa do ambiente, reativação do banco, deploy de versão estável e validação funcional ponta a ponta.

---

## 📖 3. Disaster Recovery Runbook (6 Cenários Práticos)

```
                     [ INCIDENTE OPERACIONAL DETECTADO ]
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
 [Cenário A: Deploy]        [Cenário B: Banco Corrompido]   [Cenário C: Storage]
 • Rollback no Hosting      • Pausar tráfego                • Identificar arquivos
 • Validar /health          • Restaurar snapshot Supabase   • Restaurar bucket S3
 • Testar login             • Reconciliar Stripe            • Validar RLS Storage
       │                              │                              │
       ▼                              ▼                              ▼
 [Cenário D: Supabase Out]  [Cenário E: Stripe Out]         [Cenário F: Gemini Out]
 • Status Page Supabase     • Prontuário continua ativo     • Fallback didático ativo
 • Comunicar manutenção     • Webhooks retentados 3 dias    • Prontuário continua 100%
 • Validar /ready           • Reconciliar no restabelecimento • Sem parada da aplicação
```

---

### 🚨 CENÁRIO A: Deploy com Falha ou Regressão no Frontend/Backend
* **Detecção:** Alerta de HTTP 500 no Sentry, falha no probe `GET /health` ou quebra de renderização no Error Boundary.
* **Procedimento de Recuperação:**
  1. Acessar o painel de hospedagem (ex: Vercel / Railway / Cloudflare Pages).
  2. Executar **Instant Rollback** para o último deployment estável anterior.
  3. No Git local, reverter o commit problemático (`git revert HEAD`).
  4. Executar verificação nos endpoints:
     ```bash
     curl -i https://vita4me.app/health
     curl -i https://vita4me.app/ready
     ```
  5. Validar login e carregamento básico de prontuário.

---

### 🚨 CENÁRIO B: Corrupção de Dados ou Exclusão Acidental no Banco de Dados
* **Detecção:** Erros de integridade referencial, falhas de autenticação ou exclusão indevida de tabelas.
* **Procedimento de Recuperação:**
  1. **Isolamento:** Pausar novas gravações na aplicação ativando página de manutenção se necessário.
  2. **Restauração no Supabase:**
     * Acessar *Supabase Dashboard &rarr; Database &rarr; Backups*.
     * Selecionar o snapshot diário mais recente ou o timestamp exato do Point-in-Time Recovery (PITR).
     * Disparar a restauração do banco.
  3. **Validação de Estrutura:**
     * Confirmar que todas as funções `SECURITY DEFINER` contêm `SET search_path = ''` e referências totalmente qualificadas (`public.*`, `auth.*`).
     * Confirmar que a trigger `on_auth_user_created` e a RPC `consume_ai_credit` estão presentes.
  4. **Reconciliação com o Stripe (Passo Crítico):**
     * Como o banco foi restaurado para um estado anterior, assinaturas ativadas recentemente devem ser sincronizadas via API do Stripe para atualizar `plan_tier` e `subscription_status` em `public.profiles`.
  5. **Reabertura:** Desativar página de manutenção e validar `GET /api/ready`.

---

### 🚨 CENÁRIO C: Perda de Objetos no Supabase Storage (`medical-documents`)
* **Detecção:** Impossibilidade de download de PDFs ou imagens de laudos previamente cadastrados.
* **Procedimento de Recuperação:**
  1. Identificar no banco de dados quais exames referenciam arquivos com URL em `medical-documents`.
  2. Restaurar o snapshot de objetos do bucket a partir da cópia de segurança em nuvem.
  3. Verificar a integridade das políticas de Row Level Security (RLS) do Storage:
     * Política de leitura e gravação segregada por `(storage.foldername(name))[1] = auth.uid()::text`.

---

### 🚨 CENÁRIO D: Indisponibilidade Total do Provedor Supabase
* **Detecção:** Erros generalizados de conexão de banco (`ECONNREFUSED` / timeout no backend) e status no `status.supabase.com`.
* **Procedimento de Recuperação:**
  1. Confirmar o incidente oficial no painel de status do Supabase.
  2. **Não realizar alterações manuais estruturais** durante a janela de instabilidade para evitar *split-brain*.
  3. Manter a página de aviso informando aos usuários a instabilidade momentânea do serviço de banco de dados.
  4. Assim que o Supabase restabelecer o serviço, executar probe:
     ```bash
     curl -i https://vita4me.app/api/ready
     ```
  5. Validar a consistência do pool de conexões.

---

### 🚨 CENÁRIO E: Indisponibilidade da API do Stripe
* **Detecção:** Falha na criação de checkout (`/api/stripe/create-checkout`).
* **Procedimento de Recuperação:**
  1. O Vita4Me é arquitetado de forma resiliente: **o prontuário, a leitura de exames, o controle de remédios e a IA continuam operando normalmente**, pois a autenticação depende do Supabase e não do Stripe em tempo real.
  2. Caso o usuário tente alterar plano durante a instabilidade, a interface exibe feedback amigável orientando nova tentativa em instantes.
  3. **Garantia de Webhooks:** O Stripe reenvia webhooks que falharam por até 72 horas com retry exponencial. Ao normalizar, os eventos são consumidos e registrados na tabela `stripe_webhook_events` com garantia de idempotência.

---

### 🚨 CENÁRIO F: Indisponibilidade da API Google Gemini
* **Detecção:** Timeout ou erro HTTP 429/503 na rota `/api/ai/translate-exam` ou `/api/ai/chat`.
* **Procedimento de Recuperação:**
  1. O backend em [server.ts](file:///c:/Users/luise/OneDrive/Documentos/Weber/4%20SAAS/Vita4Me/server.ts) já intercepta a falha e retorna o fallback clínico didático seguro ao usuário.
  2. O cadastro do exame, os arquivos de imagem/PDF e os indicadores continuam sendo gravados com sucesso no banco de dados.
  3. A indisponibilidade da IA é tratada como degradação parcial e não como indisponibilidade geral da plataforma.

---

## 🔄 4. Procedimento de Reconciliação Financeira (Stripe &rarr; Supabase)

Quando o banco de dados é restaurado a partir de um backup, o estado dos usuários no PostgreSQL pode estar defasado em relação às cobranças reais efetuadas no Stripe.

Para sincronizar qualquer usuário manualmente:
1. Localizar o `stripe_customer_id` ou o e-mail do usuário no dashboard do Stripe.
2. Identificar o plano ativo (`metadata.planId` = `individual` | `family`) e o status da assinatura (`trialing` | `active` | `canceled`).
3. Atualizar o registro correspondente em `public.profiles`:
   ```sql
   UPDATE public.profiles
   SET 
     plan_tier = 'individual', -- ou 'family'
     subscription_status = 'active',
     updated_at = NOW()
   WHERE id = 'USER_UUID_AQUI';
   ```

---

## 🔒 5. Segurança, Criptografia & LGPD em Cópias de Segurança

1. **Criptografia Mandatória:** Todas as cópias de backup do PostgreSQL e do Storage são criptografadas em trânsito (TLS 1.3) e em repouso (AES-256).
2. **Proibição Estrita de Dumps Locais Desprotegidos:** É terminantemente proibido realizar commits de arquivos `.sql`, `.dump` ou cópias de dados de saúde no repositório Git ou em computadores locais sem criptografia de disco.
3. **Direito ao Esquecimento (Art. 18 da LGPD):** Contas e exames excluídos por solicitação do usuário são expurgados do banco de produção imediatamente. Caso um restore de backup seja necessário, o histórico de exclusões garante que dados previamente deletados não voltem a ser expostos.
4. **Política de Retenção de Backups:**
   * Backups Diários: Retidos por 7 dias.
   * Backups Semanais: Retidos por 30 dias.
   * Expiração automática via ciclo de vida da infraestrutura.

---

## 📋 6. Checklist de Validação Pós-Restauração (Post-Restore Verification)

Após qualquer evento de restauração de banco ou infraestrutura, o Administrador Técnico deve validar:
- [ ] O endpoint `GET /health` retorna `HTTP 200 { status: "ok" }`.
- [ ] O endpoint `GET /ready` retorna `HTTP 200 { status: "ready", database: "connected" }`.
- [ ] Usuários de teste conseguem autenticar via e-mail/senha.
- [ ] As políticas de RLS estão ativas (nenhum usuário consegue ler dados de terceiros).
- [ ] Exames e documentos continuam sendo visualizados apenas pelo próprio titular.
- [ ] A trigger de criação de perfil (`on_auth_user_created`) opera corretamente.
- [ ] A RPC de dedução atômica de créditos (`consume_ai_credit`) executa com bloqueio transacional.
- [ ] Os webhooks do Stripe respondem com status 200 e registram em `stripe_webhook_events`.

---

## 👤 7. Responsabilidade Operacional

* **Papel Responsável:** Administrador Técnico / Engenharia de Infraestrutura do Vita4Me.
* **Atribuições:** Monitoramento de saúde, execução de rollbacks, acompanhamento de incidentes de terceiros (Supabase, Stripe, Google Cloud) e validação da integridade de restauração de dados.
