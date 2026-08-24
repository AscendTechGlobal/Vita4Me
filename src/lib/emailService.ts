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
