# ==============================================================================
# VITA4ME — DOCKERFILE DE PRODUÇÃO OTIMIZADO PARA GOOGLE CLOUD RUN (GCP)
# Node.js 22 LTS Alpine / Slim • Multi-stage • Zero Technical Debt
# ==============================================================================

FROM node:22-slim AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para compilar o TypeScript e Vite)
RUN npm ci --include=optional

# Copiar o código-fonte do projeto
COPY . .

# Argumentos de build para o Vite empacotar o cliente Supabase no bundle frontend
ARG VITE_SUPABASE_URL=https://jbvcikmrunxlqjbhnhkx.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidmNpa21ydW54bHFqYmhuaGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzIyNzAsImV4cCI6MjEwMjMwODI3MH0.6yPAhEfcptH_e9AQ7bX9KVncyg7qt_8SEAAlYYppFLQ

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ARG VITE_DPO_EMAIL=privacidade@vita4me.com
ARG VITE_GTM_ID=GTM-N9WNJPJ5
ARG VITE_GOOGLE_ADS_ID=
ARG VITE_GOOGLE_ADS_SIGNUP_LABEL=
ARG VITE_GOOGLE_ADS_TRIAL_LABEL=
ARG VITE_GOOGLE_ADS_PURCHASE_LABEL=
ARG VITE_CLARITY_PROJECT_ID=zeoezbfi2a

ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_DPO_EMAIL=$VITE_DPO_EMAIL
ENV VITE_GTM_ID=$VITE_GTM_ID
ENV VITE_GOOGLE_ADS_ID=$VITE_GOOGLE_ADS_ID
ENV VITE_GOOGLE_ADS_SIGNUP_LABEL=$VITE_GOOGLE_ADS_SIGNUP_LABEL
ENV VITE_GOOGLE_ADS_TRIAL_LABEL=$VITE_GOOGLE_ADS_TRIAL_LABEL
ENV VITE_GOOGLE_ADS_PURCHASE_LABEL=$VITE_GOOGLE_ADS_PURCHASE_LABEL
ENV VITE_CLARITY_PROJECT_ID=$VITE_CLARITY_PROJECT_ID

# Compilar TypeScript, Vite SPA e bundle do servidor Node.js
RUN npm run build

# Stage de Produção enxuto e seguro
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Criar usuário não-root por segurança
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs vita4me

# Copiar manifestos de dependência
COPY package*.json ./

# Instalar apenas dependências de produção para minimizar o tamanho da imagem
RUN npm ci --only=production --include=optional && npm cache clean --force

# Copiar os artefatos compilados da etapa anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Criar pasta para cofre local de documentos e permissões
RUN mkdir -p /app/data/medical-documents && chown -R vita4me:nodejs /app

USER vita4me

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
