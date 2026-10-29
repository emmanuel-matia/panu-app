# PANU — TanStack Start (SSR) servi par un serveur Node autonome (Nitro node-server).
# Le build par défaut de ce projet cible Cloudflare Workers : on force donc le preset
# Node ici pour produire un `.output/server/index.mjs` exécutable en conteneur.

FROM node:22-alpine AS build
WORKDIR /app

# Bun est déjà utilisé par le projet (bun.lock) : on garde le même gestionnaire.
RUN npm install -g bun@1

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# Vite injecte les VITE_* au build (présentes dans le .env versionné du projet).
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

COPY --from=build /app/.output ./.output
# Configuration publique Supabase (URL + clé publiable) chargée au démarrage.
COPY --from=build /app/.env ./.env

EXPOSE 3000
CMD ["node", "--env-file=.env", ".output/server/index.mjs"]
