FROM node:20-alpine

WORKDIR /app

# Copia apenas package.json e package-lock.json primeiro (cache de dependências)
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production

# Copia o resto do código
COPY . .

# Expõe a porta da API
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]