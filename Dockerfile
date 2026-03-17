# Imagen base ligera de Node.js 18
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json (si existe) primero para aprovechar cache de Docker
COPY package*.json ./

# Instalar todas las dependencias (necesarias para build)
# npm ci es más rápido y determinista si existe package-lock.json
RUN npm ci || npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript (esto ejecutará postbuild que copia los archivos .graphql)
RUN npm run build

# Asegurar que los archivos .graphql estén copiados (es crítico para producción)
RUN mkdir -p dist/infraestructura/graphql/schemas && \
    if [ -d "src/infraestructura/graphql/schemas" ]; then \
      cp -r src/infraestructura/graphql/schemas/*.graphql dist/infraestructura/graphql/schemas/ || true; \
    fi

# Imagen de producción optimizada
FROM node:18-alpine

WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production || npm install --only=production

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Usar usuario no-root para mayor seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Exponer puerto (Cloud Run usa la variable PORT)
EXPOSE 8080

# Health check básico
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar
CMD ["node", "dist/main.js"]
