import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.EMAIL_FROM || "Vita4Me <onboarding@resend.dev>";
const appUrl = process.env.APP_URL || "https://vita4me.app";

export const getResendClient = (): Resend | null => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY.trim());
};

// Base layout wrapper for all Vita4Me transactional emails
function wrapEmailLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #061F18;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #F3FAF6;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #0A3B2E;
      border: 1px solid #126D4A;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .header {
      padding: 32px 32px 20px;
      text-align: center;
      border-bottom: 1px solid rgba(18, 109, 74, 0.4);
    }
    .logo-text {
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .logo-accent {
      color: #7AC943;
    }
    .content {
      padding: 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #CDEBC5;
    }
    .content h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .card {
      background-color: #061F18;
      border: 1px solid #126D4A;
      border-radius: 14px;
      padding: 20px;
      margin: 24px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7AC943 0%, #96DC63 100%);
      color: #0A3B2E !important;
      font-weight: 800;
      font-size: 15px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(122, 201, 67, 0.3);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(122, 201, 67, 0.15);
      border: 1px solid rgba(122, 201, 67, 0.3);
      color: #7AC943;
      font-weight: 700;
      font-size: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #061F18;
      border-top: 1px solid rgba(18, 109, 74, 0.4);
      text-align: center;
      font-size: 12px;
      color: #6C8D80;
    }
    .footer a {
      color: #7AC943;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #061F18;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <div class="container">
          <div class="header">
            <span class="logo-text">vita<span class="logo-accent">4</span>me</span>
            <div style="font-size: 11px; color: #7AC943; font-weight: 600; margin-top: 4px; letter-spacing: 0.5px;">SAÚDE INTELIGENTE</div>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px;">Este e-mail é gerado automaticamente pela plataforma <strong>Vita4Me</strong>.</p>
            <p style="margin: 0 0 8px;">Seus dados de saúde são protegidos com criptografia e privacidade alinhada à LGPD.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Vita4Me Tecnologia em Saúde. Todos os direitos reservados.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. E-mail de Boas-Vindas com Início de Teste Grátis (7 Dias)
 */
export async function sendWelcomeTrialEmail(params: {
  to: string;
  name: string;
  planName: "Individual" | "Família";
}) {
  const resend = getResendClient();
  const title = `Bem-vindo(a) ao Vita4Me! Seus 7 dias de teste grátis começaram`;

  const content = `
    <div class="badge">TESTE DE 7 DIAS GRÁTIS ATIVO</div>
    <h1>Olá, ${params.name || "Paciente"}! 🌿</h1>
    <p>Seu acesso ao <strong>Plano ${params.planName}</strong> do Vita4Me foi iniciado com sucesso.</p>
    
    <div class="card">
      <strong style="color: #ffffff; display: block; margin-bottom: 8px;">O que você já pode fazer agora:</strong>
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 6px;"><strong>Tradução de Exames:</strong> Faça upload de PDFs ou fotos de laudos para entender os biomarcadores em linguagem simples.</li>
        <li style="margin-bottom: 6px;"><strong>Dossiê para Consultas:</strong> Gere relatórios consolidados em 1 clique para levar aos seus médicos.</li>
        <li style="margin-bottom: 6px;"><strong>Assistente de Saúde com IA:</strong> Tire dúvidas e organize medicamentos e rotinas com segurança.</li>
        ${params.planName === "Família" ? '<li><strong>Gestão Familiar:</strong> Cadastre até 5 membros da sua família em perfis independentes.</li>' : ''}
      </ul>
    </div>

    <p style="font-size: 13px; color: #A4D7B5;">
      <em>Você tem 7 dias corridos de acesso completo. Cancele a qualquer momento nas configurações da sua conta sem qualquer cobrança.</em>
    </p>

    <div class="button-container">
      <a href="${appUrl}" class="btn">Acessar Meu Prontuário &rarr;</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Welcome Trial -> Para: ${params.to} | Plano: ${params.planName}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.to,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de boas-vindas via Resend:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. E-mail de Exame Traduzido com Sucesso
 */
export async function sendExamTranslatedEmail(params: {
  to: string;
  name: string;
  examTitle: string;
  summary: string;
}) {
  const resend = getResendClient();
  const title = `Seu exame "${params.examTitle}" foi traduzido com sucesso`;

  const content = `
    <div class="badge">TRADUÇÃO CONCLUÍDA</div>
    <h1>Novo Laudo Disponível 📋</h1>
    <p>Olá, <strong>${params.name}</strong>! O processamento do seu exame <strong>"${params.examTitle}"</strong> foi concluído.</p>
    
    <div class="card">
      <span style="font-size: 11px; font-weight: 700; color: #7AC943; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Resumo Clínico em Linguagem Simples:</span>
      <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.5;">${params.summary}</p>
    </div>

    <p style="font-size: 13px;">Acesse sua Central de Exames no Vita4Me para visualizar a explicação detalhada de cada biomarcador e as perguntas sugeridas para sua próxima consulta médica.</p>

    <div class="button-container">
      <a href="${appUrl}" class="btn">Ver Exame Traduzido &rarr;</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Exam Translated -> Para: ${params.to} | Exame: ${params.examTitle}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.to,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de exame traduzido via Resend:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. E-mail de Confirmação de Assinatura
 */
export async function sendSubscriptionConfirmedEmail(params: {
  to: string;
  name: string;
  planName: string;
  amount: string;
}) {
  const resend = getResendClient();
  const title = `Assinatura confirmada — Plano ${params.planName} no Vita4Me`;

  const content = `
    <div class="badge">ASSINATURA CONFIRMADA</div>
    <h1>Obrigado pela confiança! 🌟</h1>
    <p>Olá, <strong>${params.name}</strong>! Seu pagamento de <strong>${params.amount}</strong> para o <strong>Plano ${params.planName}</strong> foi processado com sucesso via Stripe.</p>
    
    <div class="card">
      <p style="margin: 0; color: #ffffff;">Seus recursos continuam 100% ativos, incluindo assistente de IA, geração de dossiês em PDF e armazenamento seguro de histórico clínico.</p>
    </div>

    <p style="font-size: 13px;">Você pode gerenciar faturas e formas de pagamento a qualquer momento em <em>Configurações &gt; Faturamento</em>.</p>

    <div class="button-container">
      <a href="${appUrl}" class="btn">Abrir Vita4Me &rarr;</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Subscription Confirmed -> Para: ${params.to} | Plano: ${params.planName}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.to,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de confirmação via Resend:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Envio de E-mail de Teste Genérico
 */
export async function sendTestEmail(toEmail: string) {
  const resend = getResendClient();
  const title = "Teste de Integração Resend — Vita4Me";

  const content = `
    <div class="badge">TESTE DE INTEGRAÇÃO</div>
    <h1>Integração Resend 100% Operacional! 🚀</h1>
    <p>Este e-mail confirma que a API do <strong>Resend</strong> está configurada e funcionando com perfeição no backend do <strong>Vita4Me</strong>.</p>
    <div class="card">
      <p style="margin: 0; color: #7AC943; font-weight: 700;">Status: Conectado e Pronto para Produção</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #CDEBC5;">Disparado em: ${new Date().toLocaleString("pt-BR")}</p>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY não configurada no arquivo .env",
    };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: toEmail,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Envio de Boas-Vindas ao Trial de 7 Dias com Cartão Cadastrado
 */
export async function sendTrialWelcomeEmail(params: {
  email: string;
  name: string;
  planName: string;
  trialEndsAt: string;
  firstBillingDate: string;
  amountBrl: number;
  cardLastDigits?: string;
}) {
  const resend = getResendClient();
  const title = `Seu teste de 7 dias no Vita4Me começou! 🚀`;

  const content = `
    <div class="badge">TESTE GRATUITO ATIVO</div>
    <h1>Olá, ${params.name || "Paciente"}!</h1>
    <p>Seja muito bem-vindo ao <strong>Vita4Me</strong>. Seu período de teste gratuito de 7 dias no plano <strong>${params.planName}</strong> já está liberado!</p>
    
    <div class="card">
      <p style="margin: 0 0 8px; font-weight: 700; color: #7AC943;">Detalhes da sua assinatura:</p>
      <ul style="margin: 0; padding-left: 20px; color: #CDEBC5; font-size: 14px;">
        <li><strong>Plano:</strong> ${params.planName}</li>
        <li><strong>Período de teste:</strong> 7 dias grátis (até ${params.trialEndsAt})</li>
        <li><strong>Primeira cobrança:</strong> ${params.firstBillingDate}</li>
        <li><strong>Valor após o teste:</strong> R$ ${params.amountBrl.toFixed(2).replace('.', ',')}</li>
        <li><strong>Forma de pagamento:</strong> Cartão de Crédito final **** ${params.cardLastDigits || 'cadastrado'}</li>
      </ul>
    </div>

    <p style="margin-top: 16px; font-size: 13px; color: #8FBF9F;">
      💡 <strong>Transparência total:</strong> Nenhuma cobrança foi feita hoje. Enviaremos lembretes antes do fim do período de teste e você pode cancelar a qualquer momento nas configurações da sua conta sem qualquer custo.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${appUrl}/app" class="button">Acessar Meu Painel Vita4Me</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Trial Welcome -> ${params.email} | Plano: ${params.planName}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.email,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar email de boas-vindas ao trial via Resend:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Lembrete do Dia 5 (Faltam 2 dias para o fim do teste)
 */
export async function sendTrialReminderDay5Email(params: {
  email: string;
  name: string;
  planName: string;
  trialEndsAt: string;
  firstBillingDate: string;
  amountBrl: number;
  cardLastDigits?: string;
}) {
  const resend = getResendClient();
  const title = `Faltam 2 dias para o fim do seu teste no Vita4Me`;

  const content = `
    <div class="badge" style="background-color: #3b82f6; color: #ffffff;">LEMBRETE DE CONTA</div>
    <h1>Olá, ${params.name || "Paciente"}!</h1>
    <p>Esperamos que esteja aproveitando a gestão inteligente dos seus exames e prontuário médico no <strong>Vita4Me</strong>.</p>
    
    <p>Passando para avisar que faltam <strong>2 dias</strong> para o encerramento do seu teste gratuito de 7 dias (termina em <strong>${params.trialEndsAt}</strong>).</p>

    <div class="card">
      <p style="margin: 0 0 8px; font-weight: 700; color: #7AC943;">Resumo da Continuidade:</p>
      <ul style="margin: 0; padding-left: 20px; color: #CDEBC5; font-size: 14px;">
        <li><strong>Plano:</strong> ${params.planName}</li>
        <li><strong>Primeira cobrança automática:</strong> ${params.firstBillingDate}</li>
        <li><strong>Valor:</strong> R$ ${params.amountBrl.toFixed(2).replace('.', ',')}</li>
        <li><strong>Cartão:</strong> Final **** ${params.cardLastDigits || 'cadastrado'}</li>
      </ul>
    </div>

    <p style="margin-top: 16px; font-size: 13px; color: #8FBF9F;">
      Se estiver gostando e quiser continuar, não precisa fazer nada — seu acesso seguirá ininterrupto. Caso prefira não continuar, basta cancelar com 1 clique nas configurações antes de ${params.firstBillingDate}.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${appUrl}/app?tab=settings" class="button">Gerenciar Minha Assinatura</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Reminder Day 5 -> ${params.email}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.email,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar lembrete dia 5 via Resend:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Lembrete do Dia 6 (Último dia de teste gratuito / Cobrança amanhã)
 */
export async function sendTrialReminderDay6Email(params: {
  email: string;
  name: string;
  planName: string;
  firstBillingDate: string;
  amountBrl: number;
  cardLastDigits?: string;
}) {
  const resend = getResendClient();
  const title = `Amanhã encerra seu teste gratuito — Vita4Me`;

  const content = `
    <div class="badge" style="background-color: #f59e0b; color: #000000;">ÚLTIMO DIA DE TESTE</div>
    <h1>Último dia de teste, ${params.name || "Paciente"}!</h1>
    <p>Seu período de avaliação gratuita de 7 dias do <strong>Vita4Me</strong> encerra amanhã.</p>
    
    <div class="card">
      <p style="margin: 0 0 8px; font-weight: 700; color: #7AC943;">Cobrança do 8º dia agendada:</p>
      <ul style="margin: 0; padding-left: 20px; color: #CDEBC5; font-size: 14px;">
        <li><strong>Data:</strong> Amanhã (${params.firstBillingDate})</li>
        <li><strong>Valor:</strong> R$ ${params.amountBrl.toFixed(2).replace('.', ',')}</li>
        <li><strong>Cartão:</strong> Final **** ${params.cardLastDigits || 'cadastrado'}</li>
      </ul>
    </div>

    <p style="margin-top: 16px; font-size: 13px; color: #8FBF9F;">
      Você continua com controle total: se não desejar a renovação automática, basta cancelar agora mesmo na aba de Configurações da sua conta.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${appUrl}/app?tab=settings" class="button">Ver Configurações da Conta</a>
    </div>
  `;

  const html = wrapEmailLayout(title, content);

  if (!resend) {
    console.log(`[SIMULAÇÃO EMAIL] Reminder Day 6 -> ${params.email}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await resend.emails.send({
      from: defaultFrom,
      to: params.email,
      subject: title,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    console.error("Erro ao enviar lembrete dia 6 via Resend:", err);
    return { success: false, error: err.message };
  }
}
