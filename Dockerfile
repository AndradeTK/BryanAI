# Imagem base com Node.js e Puppeteer
FROM node:20-slim

# Instalar dependências do Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para o build do Tailwind)
RUN npm ci

# Instalar Chrome para o Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
RUN npx puppeteer browsers install chrome

# Copiar código da aplicação
COPY . .

# Build do Tailwind CSS
RUN npm run tailwind:build

# Remover devDependencies após o build
RUN npm prune --production

# Criar diretório para arquivos gerados
RUN mkdir -p /app/generated

# Expor porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
