#!/bin/bash
# Script de deploy para BASE Agency

echo "🚀 Iniciando deploy do BASE Agency..."

# Configurar git
git init
git add .
git commit -m "BASE Agency v2.0 - Full SaaS with AI Agents"

# Adicionar remote (substitua pela URL do seu repo)
git remote add origin https://github.com/gabrielkendy/base-agency-saas.git
git branch -M main
git push -u origin main

echo "✅ Código enviado para GitHub!"
echo ""
echo "Próximo passo: Configure no Render.com"
echo "1. Acesse https://dashboard.render.com/select-repo?type=web"
echo "2. Conecte o repositório base-agency-saas"
echo "3. Use as configurações do arquivo render.yaml"
