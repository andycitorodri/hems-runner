#!/bin/bash
# HEMS Runner — subir a producción con doble clic desde el Finder.
# Hace: push a GitHub + deploy de la carpeta entera a Cloudflare Workers.
cd "$(dirname "$0")" || exit 1

echo "═══════════════════════════════════════════"
echo "  HEMS Runner — subir a producción"
echo "═══════════════════════════════════════════"
echo ""

RAMA=$(git rev-parse --abbrev-ref HEAD)
echo "▶ Rama actual: $RAMA"
echo ""

echo "▶ [1/2] Subiendo cambios a GitHub..."
if git push origin "$RAMA"; then
  echo "  ✅ GitHub actualizado"
else
  echo "  ⚠️  El push falló (o no había nada nuevo). Continúo con el deploy."
fi
echo ""

echo "▶ [2/2] Desplegando a Cloudflare (app.hems.workers.dev)..."
echo "  (la primera vez se abrirá el navegador para autorizar Cloudflare)"
echo ""
if npx --yes wrangler@4 deploy; then
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  ✅ LISTO — https://app.hems.workers.dev"
  echo ""
  echo "  Abre la web con Cmd+Shift+R (recarga forzada)."
  echo "  Comprueba que las monedas son el modelo 3D"
  echo "  dorado y no un cilindro liso."
  echo "═══════════════════════════════════════════"
else
  echo ""
  echo "❌ El deploy falló. Copia el error de arriba y pásamelo."
fi

echo ""
echo "Pulsa Intro para cerrar esta ventana."
read -r _
