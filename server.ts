import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to initialize Gemini client safely
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não foi configurada nas variáveis de ambiente.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "HealthAI", version: "1.0.0" });
  });

  // 1. API route: AI Exam Translator (Tradutor Inteligente de Exames)
  app.post("/api/gemini/translate-exam", async (req, res) => {
    try {
      const { examTitle, values, summary, laboratory } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Você é o Tradutor Inteligente de Exames da plataforma HealthAI.
Sua missão é explicar os resultados do seguinte exame em português do Brasil claro, acolhedor, simples e facilmente compreensível para um paciente leigo (sem jargões médicos incompreensíveis).

DADOS DO EXAME:
- Título do Exame: ${examTitle || 'Exame de Laboratório'}
- Laboratório: ${laboratory || 'Não especificado'}
- Resumo Clínico Original: ${summary || 'Não fornecido'}
- Parâmetros e Resultados: ${JSON.stringify(values || [])}

DIRETRIZES DE ÉTICA DA HEALTHAI (OBRIGATÓRIO):
1. A HealthAI NÃO realiza diagnósticos e NÃO substitui o médico.
2. Explique o que significa cada parâmetro em palavras simples do dia a dia.
3. Se houver valores alterados ou na faixa de atenção, explique o que costuma significar de forma calma e preventiva, recomendando conversar com o médico de referência.
4. Forneça 3 perguntas práticas que o usuário pode fazer ao médico na próxima consulta.

Retorne em formato JSON válido com as chaves:
- "translatedText": Explicação detalhada e humanizada do exame em linguagem simples.
- "keyHighlights": Array de 2 a 4 pontos chave principais em bullets curtos.
- "questionsForDoctor": Array de 3 perguntas sugeridas para a consulta médica.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: { type: Type.STRING },
              keyHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              questionsForDoctor: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["translatedText", "keyHighlights", "questionsForDoctor"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, result: parsed });
    } catch (error: any) {
      console.error("Erro no tradutor de exames:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao processar a tradução do exame com a IA da HealthAI."
      });
    }
  });

  // 2. API route: HealthAI Smart Assistant Chat
  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const { message, contextData, history } = req.body;
      const ai = getGeminiClient();

      const systemInstruction = `
Você é o Assistente Inteligente HealthAI, a inteligência central da plataforma HealthAI.
Seu papel é responder dúvidas do usuário sobre o seu histórico de saúde pessoal armazenado, ajudar na navegação e traduzir informações médicas para linguagem acessível.

REGRAS RÍGIDAS DE ÉTICA E SEGURANÇA DA HEALTHAI:
- Você NÃO dá diagnósticos médicos, NÃO prescreve tratamentos e NÃO substitui o julgamento profissional de médicos.
- Seja sempre ético, acolhedor, atencioso, empático e claro.
- Responda em Português do Brasil com excelente legibilidade e estrutura visual (use negrito e tópicos quando apropriado).
- Use os dados do histórico de saúde fornecidos abaixo para responder às perguntas específicas do usuário (ex: quando fez o último exame, como evoluiu o colesterol, vacinas pendentes, etc.).

HISTÓRICO ATUALIZADO DO USUÁRIO (${contextData?.userProfile?.name || 'Paciente'}):
- Perfil: ${JSON.stringify(contextData?.userProfile || {})}
- Últimos Exames: ${JSON.stringify(contextData?.exams?.slice(0, 5) || [])}
- Histórico Clínico & Consultas: ${JSON.stringify(contextData?.medicalRecords?.slice(0, 5) || [])}
- Medicamentos em Uso: ${JSON.stringify(contextData?.medications?.filter((m: any) => m.active) || [])}
- Vacinas Registradas: ${JSON.stringify(contextData?.vaccines || [])}
- Alergias Conhecidas: ${JSON.stringify(contextData?.allergies || [])}
- Hábitos do Dia: ${JSON.stringify(contextData?.dailyHabits || {})}
      `;

      // Structure contents with history + prompt
      const contentsArray: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          contentsArray.push({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        }
      }
      contentsArray.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contentsArray,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const text = response.text || "Desculpe, não consegui processar sua solicitação no momento.";
      
      // Provide some relevant suggested follow-up prompts
      const suggestedActions = [
        "Mostre meus exames de colesterol",
        "Como evoluiu minha glicemia?",
        "Quais medicamentos utilizo hoje?",
        "Tenho alguma vacina pendente?",
        "Gerar resumo para minha próxima consulta"
      ].filter(s => s.toLowerCase() !== message.toLowerCase()).slice(0, 3);

      res.json({
        success: true,
        text,
        suggestedActions
      });
    } catch (error: any) {
      console.error("Erro no assistente HealthAI:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao comunicar com o Assistente HealthAI."
      });
    }
  });

  // 3. API route: Preparation for Medical Appointments (Preparação para Consultas)
  app.post("/api/gemini/prep-consultation", async (req, res) => {
    try {
      const { doctorName, specialty, reason, userContext } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Você é o assistente de Preparação de Consultas da HealthAI.
Ajude o usuário a se preparar de forma organizada e eficiente para a sua próxima consulta médica.

DADOS DA CONSULTA:
- Médico: ${doctorName || 'Médico(a)'}
- Especialidade: ${specialty || 'Clínica Geral'}
- Motivo / Sintomas Relatados: ${reason || 'Checkup e rotina'}
- Contexto de Saúde Atual: ${JSON.stringify(userContext || {})}

Gere uma orientação em JSON com:
- "summary": Um breve resumo do que levar e o objetivo principal da consulta.
- "checklist": Array de 3 a 5 itens práticos para levar ou fazer antes da consulta (ex: exames recentes, lista de remédios, jejum).
- "suggestedQuestions": Array de 4 a 6 perguntas fundamentais que o paciente deve fazer ao médico nessa especialidade.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              checklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestedQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "checklist", "suggestedQuestions"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, result: parsed });
    } catch (error: any) {
      console.error("Erro na preparação de consulta:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao gerar preparação para consulta."
      });
    }
  });

  // 4. API route: Document & Exam OCR / AI Extraction (Extração e Reconhecimento de Documentos)
  app.post("/api/gemini/analyze-document", async (req, res) => {
    try {
      const { documentText, documentBase64, mimeType } = req.body;
      const ai = getGeminiClient();

      const parts: any[] = [];
      if (documentBase64) {
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: documentBase64
          }
        });
      }
      parts.push({
        text: `
Análise este documento médico de forma estruturada para inclusão no histórico digital da HealthAI.
Conteúdo do texto / notas: ${documentText || 'Imagem de documento enviada.'}

Extraia em formato JSON:
- "title": Título sugerido para o documento ou exame
- "category": Categoria (Laboratorial, Imagem, Receita, Atestado, Cardiologia, Outro)
- "date": Data provável no formato YYYY-MM-DD
- "doctorName": Nome do médico se identificado
- "laboratory": Nome do laboratório/hospital se identificado
- "statusAlert": "Normal" | "Atenção" | "Alterado"
- "summary": Resumo conciso de 2 frases
- "values": Array de objetos { "name", "value", "unit", "referenceRange", "status": "Normal"|"Atenção"|"Alterado" }
- "translatedExplanation": Explicação amigável em linguagem simples
        `
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              doctorName: { type: Type.STRING },
              laboratory: { type: Type.STRING },
              statusAlert: { type: Type.STRING },
              summary: { type: Type.STRING },
              values: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    status: { type: Type.STRING }
                  }
                }
              },
              translatedExplanation: { type: Type.STRING }
            },
            required: ["title", "category", "summary", "translatedExplanation"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, result: parsed });
    } catch (error: any) {
      console.error("Erro na análise do documento:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao analisar o documento médico."
      });
    }
  });

  // 5. API route: Daily Health Tip (Dica de Saúde do Dia personalizada com IA)
  app.post("/api/gemini/daily-tip", async (req, res) => {
    try {
      const { userProfile, dailyHabits, recentMetrics, medications, focusTopic } = req.body;
      const ai = getGeminiClient();

      const prompt = `
Você é o Assistente de Medicina Preventiva e Bem-estar da HealthAI.
Gere uma "Dica de Saúde do Dia" (Health Tip of the Day) personalizada, prática, cientificamente embasada e motivadora, baseada exclusivamente no contexto de hábitos e métricas de saúde do usuário.

DADOS DO USUÁRIO:
- Nome: ${userProfile?.name || 'Paciente'} (Idade: ${userProfile?.age || 38} anos)
- Hábitos Hoje: Água ${dailyHabits?.waterIntakeMl || 1750}/${dailyHabits?.waterGoalMl || 2500}ml, Sono ${dailyHabits?.sleepHours || 7.5}h (${dailyHabits?.sleepQuality || 'Boa'}), Humor: ${dailyHabits?.mood || 'Bem'}, Atividade: ${dailyHabits?.physicalActivityMins || 45}min (${dailyHabits?.activityType || 'Exercício'}), Peso: ${dailyHabits?.bodyWeightKg || 78.2}kg
- Métricas Recentes: ${JSON.stringify(recentMetrics || [])}
- Medicamentos / Suplementos: ${JSON.stringify(medications?.map((m: any) => `${m.name} (${m.dosage})`) || [])}
${focusTopic ? `- Foco Temático Desejado: "${focusTopic}"` : ''}

DIRETRIZES DA HEALTHAI:
- Foque em uma dica altamente prática e aplicável para o dia de hoje (ex: otimização de hidratação, sono restaurador, redução de colesterol por fibras solúveis, absorção de vitamina D com gorduras boas, pausas ativas, controle pressórico).
- Tom: acolhedor, profissional, encorajador e preventivo.
- Não substitua diagnóstico médico.

Retorne em formato JSON estrito:
- "title": Título curto e cativante da dica (máx 6 palavras)
- "category": Categoria (ex: "Nutrição & Colesterol", "Hidratação & Energia", "Sono Restaurador", "Atividade Física & Longevidade", "Saúde Preventiva")
- "tip": Parágrafo explicativo e motivador da dica (3 a 4 frases)
- "actionableAdvice": Um passo prático ou micro-hábito para executar hoje (1 frase em destaque)
- "scienceFact": Uma breve evidência ou curiosidade científica associada (1 frase)
- "badge": Texto de destaque (ex: "Foco de Hoje", "Destaque Clínico", "Rotina Otimizada", "Micro-Hábito")
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              tip: { type: Type.STRING },
              actionableAdvice: { type: Type.STRING },
              scienceFact: { type: Type.STRING },
              badge: { type: Type.STRING }
            },
            required: ["title", "category", "tip", "actionableAdvice", "scienceFact"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, tip: parsed });
    } catch (error: any) {
      console.error("Erro ao gerar dica de saúde:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao gerar dica de saúde personalizada."
      });
    }
  });

  // Vite development middleware or static asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HealthAI Server rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
