# 🚀 Deploy BASE Agency em agenciabase.tech

## Opção 1: Render.com (RECOMENDADO - Grátis)

### Passo 1: Criar conta no Render
1. Acesse https://render.com
2. Crie conta com GitHub

### Passo 2: Subir código pro GitHub
```bash
cd C:\Users\Gabriel\Downloads\base-agency-saas
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/base-agency.git
git push -u origin main
```

### Passo 3: Criar Web Service no Render
1. Dashboard → New → Web Service
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: base-agency
   - **Region**: Oregon (US West)
   - **Branch**: main
   - **Root Directory**: (deixe vazio)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

4. Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`

5. Clique "Create Web Service"

### Passo 4: Configurar Cloudflare DNS
Após o deploy, você terá uma URL como: `base-agency.onrender.com`

No Cloudflare (agenciabase.tech):
1. Vá em DNS → Adicionar registro
2. Adicione:
   - **Tipo**: CNAME
   - **Nome**: @ (ou app)
   - **Conteúdo**: base-agency.onrender.com
   - **Proxy**: ✅ Ativado

### Passo 5: SSL no Render
1. Settings → Custom Domains
2. Adicione: agenciabase.tech
3. Render irá verificar automaticamente

---

## Opção 2: Railway.app

### Passo 1: Criar conta
1. Acesse https://railway.app
2. Login com GitHub

### Passo 2: Deploy
1. New Project → Deploy from GitHub repo
2. Selecione o repositório
3. Railway detecta Node.js automaticamente

### Passo 3: Variáveis
1. Variables → Add:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`

### Passo 4: Custom Domain
1. Settings → Domains
2. Add Custom Domain: agenciabase.tech
3. Copie o CNAME fornecido

### Passo 5: Cloudflare
No DNS, adicione CNAME apontando para o Railway

---

## ⚡ Comandos Rápidos

### Build local
```bash
npm run build
```

### Testar produção localmente
```bash
NODE_ENV=production npm start
```

### Atualizar deploy
```bash
git add .
git commit -m "Update"
git push
```
O deploy é automático!

---

## 📱 URLs Finais

- **App**: https://agenciabase.tech
- **API**: https://agenciabase.tech/api
- **Health Check**: https://agenciabase.tech/api/health

---

## 🔧 Troubleshooting

### Erro de build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Banco de dados resetado
O Render/Railway usa filesystem efêmero. Para persistência:
- Use PostgreSQL (Render oferece grátis)
- Ou Supabase/PlanetScale

---

Pronto! Seu app estará online em agenciabase.tech 🎉
