# =============================================================
# Rollup — image statique servie par nginx
# Application 100 % front-end : aucune étape de build, aucun Node.
# =============================================================
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Rollup" \
      org.opencontainers.image.description="Catalogue personnel de jeux de société" \
      org.opencontainers.image.licenses="MIT"

# Configuration nginx (gzip, cache, en-têtes de sécurité)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fichiers de l'application
COPY index.html manifest.webmanifest /usr/share/nginx/html/
COPY css/    /usr/share/nginx/html/css/
COPY js/     /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
