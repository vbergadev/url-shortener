#!/usr/bin/env bash
# Sobe o projeto localmente com um único comando: ./run.sh
#
# - Garante .env (copiado de .env.example na primeira execução).
# - Instala dependências se node_modules não existir ou o lockfile mudou.
# - Sobe o servidor em modo dev (tsx watch), sem precisar de build antes.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> .env criado a partir de .env.example"
fi

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  echo "==> Instalando dependências..."
  npm install
fi

echo "==> Subindo servidor (npm run dev)..."
exec npm run dev
