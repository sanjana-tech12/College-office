FROM node:20-alpine

# Set application directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only using clean install
RUN npm ci --only=production

# Copy source code
COPY . .

# Ensure non-root ownership
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose web service port
EXPOSE 3000

# Container healthcheck using wget on /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Express server
CMD ["node", "backend/server.js"]
