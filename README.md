# 🚀 BASE Agency - Super SaaS para Agências de Marketing

Sistema completo de gerenciamento de demandas com time de agentes de IA especializados.

![BASE Agency](https://img.shields.io/badge/BASE-Agency-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple?style=flat-square)

---

## ✨ Funcionalidades

### 🤖 Chat com IA (Auto-Tarefa)
- **7 agentes especializados**: Sofia (Gestora), Lucas (Planejador), Clara (Designer), Leo (Roteirista), Bia (Posts), Davi (Legendas), Ana (Planilhas)
- **Criação automática de tarefas**: Cole sua demanda no chat e a IA cria automaticamente no Kanban!
- **Menções**: Use @Nome para falar com um especialista específico
- **Streaming**: Respostas em tempo real

### 📋 Workflow Kanban
- **Drag & Drop**: Arraste tarefas entre colunas
- **5 status**: Backlog → A Fazer → Em Andamento → Revisão → Aprovado
- **Prioridades**: Alta, Média, Baixa
- **Filtros por canal**: Instagram, Facebook, TikTok, YouTube, LinkedIn

### ✅ Aprovação Externa
- **Link único**: Gere um link para o cliente aprovar o conteúdo
- **Interface limpa**: Cliente vê apenas o conteúdo relevante
- **Feedback**: Cliente pode aprovar ou solicitar ajustes
- **Notificações**: Receba alertas quando cliente responder

### 🎨 Estúdio Criativo
- **Geração de imagens**: Crie imagens baseadas em prompt
- **Estilos visuais**: Moderno, Vibrante, Profissional, Criativo, Natureza, Tech
- **Legendas automáticas**: IA gera legendas otimizadas para cada rede social
- **Galeria**: Histórico de imagens geradas

### 🔔 Notificações
- **Tempo real**: Toast notifications para ações importantes
- **Histórico**: Painel com todas as notificações

### 📚 Base de Conhecimento
- **Upload de arquivos**: Treine os agentes com conhecimento específico
- **Por agente ou global**: Escolha onde o conhecimento será usado
- **Integração Google**: Importe arquivos do Drive e Gmail

---

## 🛠️ Instalação Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1️⃣ Clone o repositório
```bash
git clone https://github.com/seu-usuario/base-agency-saas.git
cd base-agency-saas
```

### 2️⃣ Instale dependências
```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 3️⃣ Execute
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### 4️⃣ Acesse
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

---

## 🌐 Deploy em Produção

### Opção 1: Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel)
1. Conecte seu GitHub ao Vercel
2. Importe o repositório
3. Deploy automático!

#### Backend (Render)
1. Acesse https://render.com
2. New → Web Service
3. Conecte o repositório
4. Root Directory: `server`
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Deploy!

### Opção 2: Netlify (Frontend) + Railway (Backend)

#### Frontend (Netlify)
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

#### Backend (Railway)
1. Acesse https://railway.app
2. New Project → Deploy from GitHub
3. Selecione a pasta `server`
4. Deploy automático!

---

## 🔑 Configurações Opcionais

### Google OAuth (Drive/Gmail)
1. Acesse https://console.cloud.google.com/apis/credentials
2. Crie um projeto
3. Configure "Tela de consentimento OAuth"
4. Crie credenciais "ID do cliente OAuth 2.0"
5. Adicione no `server/.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/oauth/google/callback
```

---

## 📁 Estrutura do Projeto

```
base-agency-saas/
├── src/                      # Frontend React
│   ├── components/           # Componentes reutilizáveis
│   │   ├── Icons.tsx         # Biblioteca de ícones
│   │   └── Sidebar.tsx       # Menu lateral
│   ├── pages/                # Páginas da aplicação
│   │   ├── ChatPage.tsx      # Chat com IA (Auto-Tarefa)
│   │   ├── WorkflowPage.tsx  # Kanban de demandas
│   │   ├── ApprovalPage.tsx  # Página de aprovação externa
│   │   ├── StudioPage.tsx    # Geração de imagens
│   │   ├── AgentsPage.tsx    # Configuração de agentes
│   │   ├── KnowledgePage.tsx # Base de conhecimento
│   │   └── SettingsPage.tsx  # Configurações
│   ├── services/             # Serviços externos
│   │   └── geminiService.ts  # Integração Gemini AI
│   ├── store/                # Estado global (Zustand)
│   │   └── index.ts          # Store principal
│   └── types/                # Tipagens TypeScript
├── server/                   # Backend Node.js
│   ├── server.js             # API Express
│   ├── db.json               # Banco de dados JSON
│   └── .env                  # Variáveis de ambiente
├── vercel.json               # Config Vercel
├── netlify.toml              # Config Netlify
├── render.yaml               # Config Render
└── README.md
```

---

## 🎯 Como Usar

### 1. Chat com IA (Auto-Tarefa)
1. Selecione "Time Completo" ou um agente específico
2. Ative o botão "Auto-Tarefa ON"
3. Cole sua demanda: *"Criar um carrossel sobre marketing digital para TechStart, prioridade alta"*
4. A IA analisa e cria automaticamente a tarefa no Kanban!

### 2. Workflow Kanban
1. Acesse o menu "Workflow"
2. Arraste tarefas entre colunas
3. Clique em uma tarefa para ver detalhes
4. Gere link de aprovação para o cliente

### 3. Aprovação Externa
1. No Kanban, clique na tarefa
2. Copie o "Link de Aprovação"
3. Envie para o cliente
4. Cliente acessa, revisa e aprova/pede ajuste
5. Você recebe notificação!

### 4. Estúdio Criativo
1. Descreva a imagem desejada
2. Escolha estilo e proporção
3. Clique em "Gerar Imagem"
4. Use "Gerar Legenda" para criar copy automática

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 👨‍💻 Desenvolvido por

**BASE Marketing Agency** 🚀

---

*Feito com ❤️ e muito café ☕*
