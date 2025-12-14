# BASE Agency - Super SaaS para Agências de Marketing

Sistema completo de gerenciamento com time de agentes de IA especializados.

## 🚀 Funcionalidades

- **Chat IA** - Converse com 7 agentes especializados (Gemini AI)
- **Treinamento de Agentes** - Injete conhecimento específico por agente
- **Workflow Kanban** - Gestão de demandas com drag-drop
- **Aprovação Externa** - Link único para clientes aprovarem conteúdo
- **Estúdio Criativo** - Geração de imagens + legendas automáticas
- **Integrações Google** - Drive, Gmail (importação de arquivos)
- **Notificações** - Alertas em tempo real

## 📦 Instalação Local

### 1. Frontend
```bash
cd base-agency-saas
npm install
npm run dev
# Acesse: http://localhost:5173
```

### 2. Backend
```bash
cd server
npm install
npm run dev
# API: http://localhost:3001
```

## 🔑 Configurações

### API Gemini (já configurada)
A API Key do Gemini já está fixa no código.

### Google OAuth (opcional)
Para usar as integrações com Drive/Gmail:

1. Acesse https://console.cloud.google.com/apis/credentials
2. Crie um projeto ou selecione existente
3. Configure "Tela de consentimento OAuth"
4. Crie credenciais "ID do cliente OAuth 2.0"
5. Tipo: Aplicativo da Web
6. Origens autorizadas: `http://localhost:3001`
7. URIs de redirecionamento: `http://localhost:3001/api/oauth/google/callback`
8. Copie Client ID e Client Secret
9. Cole no arquivo `server/.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/oauth/google/callback
```

## 🌐 Deploy em Produção

### Opção 1: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
npm install -g vercel
cd base-agency-saas
vercel
```

**Backend (Railway):**
1. Acesse https://railway.app
2. Conecte seu GitHub
3. Selecione o repositório
4. Configure variáveis de ambiente
5. Deploy automático!

### Opção 2: VPS (DigitalOcean/Hostinger)

```bash
# No servidor
git clone seu-repo
cd base-agency-saas

# Frontend
npm install
npm run build

# Backend
cd server
npm install
pm2 start server.js --name base-backend

# Nginx config
sudo nano /etc/nginx/sites-available/base-agency
```

## 📁 Estrutura

```
base-agency-saas/
├── src/                  # Frontend React
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/            # Páginas da aplicação
│   ├── services/         # Serviços (Gemini API)
│   ├── store/            # Estado global (Zustand)
│   └── types/            # Tipagens TypeScript
├── server/               # Backend Node.js
│   ├── server.js         # API Express
│   ├── db.json           # Banco de dados JSON
│   └── .env              # Variáveis de ambiente
└── README.md
```

## 🎯 Uso

1. **Chat IA**: Selecione um agente e converse
2. **Treinar Agente**: Vá em Agentes → Upload arquivo → Treinar Agente
3. **Workflow**: Arraste demandas entre colunas
4. **Aprovação**: Gere link para cliente aprovar
5. **Estúdio**: Gere imagens com prompts

## 👨‍💻 Desenvolvido por

BASE Marketing Agency

## 📄 Licença

MIT
