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
