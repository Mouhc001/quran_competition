FROM node:18-alpine

WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./

# Installation des dépendances (inclut les devDependencies pour build)
RUN npm install

# Copie tout le code source
COPY . .

# Le port utilisé par l'app
EXPOSE 8080

# Démarrage
CMD ["node", "server.js"]