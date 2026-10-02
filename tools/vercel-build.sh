#!/bin/sh
# Build-commando voor Vercel (zie vercel.json).
#
# Waarom een script en niet rechtstreeks in vercel.json? Vercel haalt
# $VARIABELEN door de build-commando heen voordat de shell hem uitvoert, en
# dan breekt de ${A:-${B:-}}-syntax van sh. In dit bestand blijft alles
# letterlijk, dus werkt het wel.
#
# De Supabase-integrator (Vercel → Integrations) zet de sleutels onder eigen
# namen; hieronder knopen we ze aan de namen die Expo in de bundel embedt.
set -e

EXPO_PUBLIC_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
export EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY

if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
  echo "Supabase-URL gevonden: $EXPO_PUBLIC_SUPABASE_URL"
else
  echo "GEEN Supabase-URL gevonden — de app bouwt in de lokale modus."
  echo "Controleer in Vercel → Settings → Environment Variables of de"
  echo "connector-variabelen er staan (naam eindigt op SUPABASE_URL /"
  echo "SUPABASE_ANON_KEY) en of ze voor Production gelden."
fi

# --clear: zónder dat bewaart Metro een oude EXPO_PUBLIC_-waarde en bouw je
# stiekem met een verouderde Supabase-URL (of een lege die niet meer klopt).
npx expo export -p web --clear

# Vercel serveert bij een onbekende URL automatisch 404.html. Zonder deze
# kopie zien gasten de standaard-404 van Vercel in plaats van onze eigen
# vriendelijke pagina (app/+not-found.js).
if [ -f "dist/+not-found.html" ]; then
  cp "dist/+not-found.html" "dist/404.html"
  echo "404-pagina klaargezet (dist/404.html)"
fi
