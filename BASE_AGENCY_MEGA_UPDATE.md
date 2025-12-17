# 🚀 BASE AGENCY - MEGA UPDATE COMPLETO

## INSTRUÇÕES PARA CLAUDE CODE

```
⚠️ EXECUTE TUDO SEM PARAR, SEM PEDIR AUTORIZAÇÃO, ATÉ O DEPLOY FINAL.
⚠️ NÃO MOSTRE CÓDIGO PARCIAL - FAÇA TUDO COMPLETO
⚠️ SE ENCONTRAR ERRO, CORRIJA E CONTINUE
⚠️ FAÇA BUILD ANTES DO COMMIT PARA VERIFICAR ERROS
⚠️ FAÇA DEPLOY NO FINAL (git push)
```

---

## 📁 INFORMAÇÕES DO PROJETO

```
PASTA: C:\Users\Gabriel\Downloads\base-agency-saas
STACK: React + TypeScript + Vite + Tailwind CSS + Zustand
GITHUB: https://github.com/gabrielkendy/agenciabase
DEPLOY: Render (auto-deploy via git push)
DOMÍNIO: https://agenciabase.tech
DATABASE: Supabase (letwmctvmzclesccypdd)
```

---

# 📋 ÍNDICE DAS 3 GRANDES ATUALIZAÇÕES

| # | Módulo | Descrição | Prioridade |
|---|--------|-----------|------------|
| 1 | **CHAT IA COM PROJETOS** | Sistema de projetos igual Claude com conhecimento, instruções e múltiplos chats | 🔴 ALTA |
| 2 | **CREATOR STUDIO + FREEPIK** | Canvas visual igual Freepik Spaces + API Freepik para gerar imagens/vídeos | 🔴 ALTA |
| 3 | **WORKFLOW PROFISSIONAL** | Sistema completo igual mLabs com aprovações, links externos e agendamento | 🔴 ALTA |

---

# ═══════════════════════════════════════════════════════════════
# PARTE 1: CHAT IA COM SISTEMA DE PROJETOS
# ═══════════════════════════════════════════════════════════════

## 🎯 OBJETIVO
Transformar o Chat IA atual em um sistema completo de projetos igual ao Claude Projects, onde cada projeto tem:
- Instruções personalizadas (system prompt)
- Base de conhecimento (PDFs, URLs, textos)
- Múltiplos chats/conversas dentro do projeto
- Múltiplos agentes podem trabalhar no mesmo projeto

## 📊 ESTRUTURA DO BANCO DE DADOS (SUPABASE)

### Tabela: chat_projects
```sql
CREATE TABLE chat_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '📁',
  color VARCHAR(20) DEFAULT '#f97316',
  instructions TEXT, -- System prompt personalizado do projeto
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_projects_user ON chat_projects(user_id);
```

### Tabela: project_knowledge
```sql
CREATE TABLE project_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES chat_projects(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'pdf', 'url', 'text', 'file'
  title VARCHAR(255) NOT NULL,
  content TEXT, -- Conteúdo extraído
  source_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_knowledge_project ON project_knowledge(project_id);
```

### Tabela: project_agents
```sql
CREATE TABLE project_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES chat_projects(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'participant', -- 'lead', 'participant'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, agent_id)
);
```

### Tabela: project_conversations
```sql
CREATE TABLE project_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES chat_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Nova conversa',
  summary TEXT,
  is_pinned BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_conversations_project ON project_conversations(project_id);
```

### Tabela: project_messages
```sql
CREATE TABLE project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES project_conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  mentions TEXT[], -- IDs de agentes mencionados
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_messages_conversation ON project_messages(conversation_id);
CREATE INDEX idx_project_messages_created ON project_messages(created_at DESC);
```

## 🎨 LAYOUT DA PÁGINA DE CHAT (ChatPage.tsx)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🟠 BASE Agency SaaS                                                         │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────────────────────────┐   │
│  SIDEBAR   │  │ 📁 Projeto: Marketing Digital 2025                      │   │
│            │  │ ────────────────────────────────────────────────────────│   │
│ ┌────────┐ │  │                                                         │   │
│ │PROJETOS│ │  │  TABS: [💬 Chats] [📚 Conhecimento] [⚙️ Instruções]    │   │
│ └────────┘ │  │                                                         │   │
│            │  │  ┌─────────────────────────────────────────────────┐    │   │
│ 📁 Marketing│  │  │ LISTA DE CHATS DO PROJETO                       │    │   │
│ 📁 Vendas  │  │  │                                                  │    │   │
│ 📁 Suporte │  │  │ 💬 Estratégia de conteúdo     14/12/2025        │    │   │
│            │  │  │ 💬 Análise de concorrentes    13/12/2025        │    │   │
│ + Novo     │  │  │ 💬 Planejamento mensal        12/12/2025        │    │   │
│   Projeto  │  │  │                                                  │    │   │
│            │  │  │ [+ Nova Conversa]                                │    │   │
│────────────│  │  └─────────────────────────────────────────────────┘    │   │
│            │  │                                                         │   │
│ CONVERSAS  │  │  OU (quando conversa selecionada):                      │   │
│ RECENTES   │  │                                                         │   │
│            │  │  ┌─────────────────────────────────────────────────┐    │   │
│ 💬 Chat 1  │  │  │ ÁREA DE MENSAGENS                                │    │   │
│ 💬 Chat 2  │  │  │                                                  │    │   │
│ 💬 Chat 3  │  │  │ [Avatar] Nome do Agente                         │    │   │
│            │  │  │ Mensagem do agente aqui...                       │    │   │
│            │  │  │                                                  │    │   │
│            │  │  │ [Você]                                           │    │   │
│            │  │  │ Sua mensagem aqui...                             │    │   │
│            │  │  │                                                  │    │   │
│            │  │  └─────────────────────────────────────────────────┘    │   │
│            │  │                                                         │   │
│            │  │  ┌─────────────────────────────────────────────────┐    │   │
│            │  │  │ [📷] [🎬] [📎] | Digite sua mensagem... [@]  [➤]│    │   │
│            │  │  └─────────────────────────────────────────────────┘    │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                │
│            │  PAINEL LATERAL DIREITO (quando aberto):                       │
│            │  ┌──────────────────────┐                                      │
│            │  │ 🤖 AGENTES           │                                      │
│            │  │ ──────────────────── │                                      │
│            │  │ 🟢 Sofia (ativo)     │                                      │
│            │  │ ⚪ Ana               │                                      │
│            │  │ ⚪ Carlos            │                                      │
│            │  │                      │                                      │
│            │  │ 👥 EQUIPE            │                                      │
│            │  │ ──────────────────── │                                      │
│            │  │ 👤 João Silva        │                                      │
│            │  │ 👤 Maria Santos      │                                      │
│            │  │                      │                                      │
│            │  │ [+ Convidar]         │                                      │
│            │  └──────────────────────┘                                      │
└────────────┴────────────────────────────────────────────────────────────────┘
```

## 📂 ARQUIVOS A CRIAR/MODIFICAR

### 1. src/pages/ChatPage.tsx (REFATORAR COMPLETAMENTE)
- Layout com sidebar de projetos à esquerda
- Área central com tabs (Chats, Conhecimento, Instruções)
- Painel lateral direito com agentes/equipe
- Sistema de projetos com CRUD completo

### 2. src/components/chat/ProjectSidebar.tsx (NOVO)
```typescript
// Sidebar esquerda com lista de projetos
// - Criar novo projeto
// - Listar projetos existentes
// - Arquivar/excluir projetos
// - Ícone e cor personalizáveis
```

### 3. src/components/chat/ProjectTabs.tsx (NOVO)
```typescript
// Tabs do projeto:
// - Chats: Lista de conversas do projeto
// - Conhecimento: Upload de PDFs, URLs, textos
// - Instruções: System prompt personalizado
```

### 4. src/components/chat/ProjectKnowledge.tsx (NOVO)
```typescript
// Igual ao KnowledgeTab da página de Agentes
// - Upload de PDFs
// - Adicionar URLs
// - Adicionar textos
// - Lista de conhecimentos adicionados
// - Botão "Aplicar ao Projeto"
```

### 5. src/components/chat/ProjectInstructions.tsx (NOVO)
```typescript
// Editor de instruções do projeto
// - Textarea grande para system prompt
// - Sugestões de instruções
// - Salvar automaticamente
```

### 6. src/components/chat/ConversationList.tsx (NOVO)
```typescript
// Lista de conversas do projeto
// - Título da conversa
// - Data da última mensagem
// - Preview da última mensagem
// - Fixar conversa
// - Excluir conversa
```

### 7. src/components/chat/ChatArea.tsx (NOVO)
```typescript
// Área de chat propriamente dita
// - Mensagens
// - Input com anexos
// - Menções @
// - Múltiplos agentes respondendo
```

### 8. src/services/projectService.ts (NOVO)
```typescript
export const projectService = {
  // Projetos
  createProject: async (data: CreateProjectDTO) => {...},
  getProjects: async (userId: string) => {...},
  updateProject: async (id: string, data: UpdateProjectDTO) => {...},
  deleteProject: async (id: string) => {...},
  
  // Conhecimento
  addKnowledge: async (projectId: string, data: KnowledgeDTO) => {...},
  getKnowledge: async (projectId: string) => {...},
  deleteKnowledge: async (id: string) => {...},
  
  // Conversas
  createConversation: async (projectId: string, title?: string) => {...},
  getConversations: async (projectId: string) => {...},
  deleteConversation: async (id: string) => {...},
  
  // Mensagens
  sendMessage: async (conversationId: string, data: MessageDTO) => {...},
  getMessages: async (conversationId: string) => {...},
  
  // Agentes do projeto
  addAgentToProject: async (projectId: string, agentId: string) => {...},
  removeAgentFromProject: async (projectId: string, agentId: string) => {...},
  getProjectAgents: async (projectId: string) => {...},
};
```

### 9. src/store/chatStore.ts (REFATORAR)
```typescript
interface ChatState {
  // Projetos
  projects: Project[];
  currentProjectId: string | null;
  
  // Conversas
  conversations: Conversation[];
  currentConversationId: string | null;
  
  // Mensagens
  messages: Message[];
  
  // UI State
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  activeTab: 'chats' | 'knowledge' | 'instructions';
  
  // Actions
  setCurrentProject: (id: string | null) => void;
  setCurrentConversation: (id: string | null) => void;
  // ... mais actions
}
```

## 🔄 FLUXO DE USO

```
1. Usuário acessa /chat
   └─> Vê lista de projetos na sidebar esquerda

2. Usuário cria novo projeto
   └─> Modal: Nome, descrição, ícone, cor
   └─> Projeto criado e selecionado

3. Dentro do projeto:
   └─> Tab "Instruções": Define system prompt
   └─> Tab "Conhecimento": Upload PDFs/URLs/textos
   └─> Tab "Chats": Cria e gerencia conversas

4. Adiciona agentes ao projeto
   └─> Painel direito: seleciona agentes
   └─> Agentes ficam disponíveis para @menção

5. Cria nova conversa
   └─> Inicia chat com contexto do projeto
   └─> Pode @mencionar agentes específicos
   └─> Histórico salvo automaticamente

6. Múltiplos agentes respondem
   └─> Se mencionar @Sofia, ela responde
   └─> Se mencionar @Ana, ela responde
   └─> Cada um com sua personalidade
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 2: CREATOR STUDIO + FREEPIK API
# ═══════════════════════════════════════════════════════════════

## 🎯 OBJETIVO
Recriar o Freepik Spaces com canvas visual + integrar API do Freepik para geração de imagens e vídeos.

## 🔑 API DO FREEPIK

```typescript
// Configuração da API
const FREEPIK_API_URL = 'https://api.freepik.com';
const FREEPIK_API_KEY = 'FPSX...'; // Será configurado nas settings

// Endpoints principais:
// POST /v1/ai/text-to-image - Gerar imagem
// POST /v1/ai/image-to-image - Transformar imagem
// POST /v1/ai/image-to-video - Gerar vídeo
// GET /v1/ai/models - Listar modelos disponíveis
```

## 📊 MODELOS DISPONÍVEIS (baseado nas imagens)

### Modelos de Imagem:
- Seedream 4 4K
- Flux Pro
- SDXL
- Mystic

### Modelos de Vídeo:
- Google Nano Banana Pro (~57s)
- GPT (~34s)
- GPT 1 - HQ (~1m)
- GPT 1.5 (~39s)
- GPT 1.5 - High (~58s)
- Reve (~13s)
- Runway (~16s)
- Seedream 4 (~31s)
- Seedream 4 4K (~45s)
- Seedream 4.5 (~1m)
- Kling 2.6 / Kling O1
- OpenAI Sora 2 / Sora 2 Pro
- Omni Human 1.5
- Google Veo 3.1
- LTX 2 Fast
- Wan 2.6

### Aspect Ratios:
- 1:1, 16:9, 9:16, 2:3, 3:4, 1:2, 2:1, 4:5, 3:2, 4:3

## 🎨 LAYOUT DO CREATOR STUDIO (IGUAL FREEPIK SPACES)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🟠 BASE │ AI Suite │ Personal │ Spaces BETA │ [Nome do Projeto] │ [Share 👤]│
├─────────┬───────────────────────────────────────────────────────────────────┤
│         │                                                                   │
│ SIDEBAR │              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│ ESQUERDA│              ░░░░░░░░░░ CANVAS INFINITO ░░░░░░░░░░░░             │
│         │              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│ ┌─────┐ │                                                                   │
│ │  +  │ │     ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│ └─────┘ │     │  🖼️      │──────│  🖼️      │──────│  🎬      │            │
│ ┌─────┐ │     │ Imagem 1 │      │ Imagem 2 │      │ Video 1  │            │
│ │ ▶️  │ │     └──────────┘      └──────────┘      └──────────┘            │
│ └─────┘ │            │                │                │                   │
│ ┌─────┐ │            └────────────────┴────────────────┘                   │
│ │ 🎤  │ │                             │                                    │
│ └─────┘ │                    ┌──────────────────┐                          │
│ ┌─────┐ │                    │   🤖 Assistant   │                          │
│ │ ✂️  │ │                    │   GPT-4.1 Mini   │                          │
│ └─────┘ │                    └──────────────────┘                          │
│ ┌─────┐ │                                                                   │
│ │ 📦  │ │              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│ └─────┘ │              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│         │                                                                   │
│─────────│  ┌─────────────────────────────────────────────────────────────┐ │
│ 🔍 Search│  │ [Give feedback 💬]                              [20% zoom] │ │
│ 📤 Upload│  └─────────────────────────────────────────────────────────────┘ │
│ 🖼️ Media │                                                                   │
│─────────│                                                                   │
│ NODES   │                                                                   │
│─────────│                                                                   │
│ 📝 Text │                                                                   │
│ 🖼️ Image│                                                                   │
│   Generator                                                                 │
│ 🎬 Video│                                                                   │
│   Generator                                                                 │
│ 🤖 Assistant                                                                │
│ 🔍 Image│                                                                   │
│   Upscaler                                                                  │
│─────────│                                                                   │
│ UTILITIES                                                                   │
│   ▼     │                                                                   │
└─────────┴───────────────────────────────────────────────────────────────────┘
```

## 📊 PAINEL LATERAL DIREITO (Quando nó selecionado)

### Para Image Generator:
```
┌────────────────────────────┐
│ Image Generator        [▶️]│
├────────────────────────────┤
│ MODEL                      │
│ ┌────────────────────────┐ │
│ │ 📊 Seedream 4 4K    ▼  │ │
│ └────────────────────────┘ │
│                            │
│ REFERENCES          [+ Add]│
│ ┌────┐ ┌────┐ ┌────┐      │
│ │ ✨ │ │ 👤 │ │ 📤 │      │
│ │Style│ │Char│ │Upload    │
│ └────┘ └────┘ └────┘      │
│                            │
│ PROMPT                     │
│ ┌────────────────────────┐ │
│ │ Describe the image     │ │
│ │ you want to generate...│ │
│ └────────────────────────┘ │
│                            │
│ ASPECT RATIO               │
│ [1:1][16:9][9:16][2:3]... │
│                            │
│ [     🚀 Generate      ]   │
└────────────────────────────┘
```

### Para Video Generator:
```
┌────────────────────────────┐
│ Video Generator        [▶️]│
├────────────────────────────┤
│ MODEL                      │
│ ┌────────────────────────┐ │
│ │ 📊 Kling 2.1       ▼   │ │
│ └────────────────────────┘ │
│                            │
│ SOURCE IMAGE               │
│ ┌────────────────────────┐ │
│ │      [Drag image]      │ │
│ │   or connect from node │ │
│ └────────────────────────┘ │
│                            │
│ MOTION PROMPT              │
│ ┌────────────────────────┐ │
│ │ Describe the motion... │ │
│ │ "zoom out slowly"      │ │
│ └────────────────────────┘ │
│                            │
│ DURATION                   │
│ [5s] [10s]                 │
│                            │
│ ASPECT RATIO               │
│ [9:16][16:9][1:1]          │
│                            │
│ [     🎬 Generate      ]   │
└────────────────────────────┘
```

### Para Assistant:
```
┌────────────────────────────┐
│ Assistant              [▶️]│
├────────────────────────────┤
│ Models                     │
│ ┌────────────────────────┐ │
│ │ GPT-4.1 Mini       ▼   │ │
│ └────────────────────────┘ │
│                            │
│ System prompt              │
│ ┌────────────────────────┐ │
│ │ Add custom instructions│ │
│ │ for the model          │ │
│ │ (optional)             │ │
│ └────────────────────────┘ │
│                            │
│ CHAT                       │
│ ┌────────────────────────┐ │
│ │ Assistant is your      │ │
│ │ creative sidekick...   │ │
│ │                        │ │
│ │ [Type message...]      │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

## 📂 ARQUIVOS A CRIAR

### 1. src/pages/CreatorStudioPage.tsx (REFATORAR)
```typescript
// Canvas infinito com React Flow
// Fundo escuro com grid de pontos
// Zoom e pan
// Sidebar esquerda com nodes
// Painel direito dinâmico
```

### 2. src/components/studio/StudioCanvas.tsx
```typescript
// Canvas principal usando @xyflow/react
// Configuração de background
// Controles de zoom
// Minimap opcional
```

### 3. src/components/studio/StudioSidebar.tsx
```typescript
// Sidebar esquerda igual Freepik:
// - Search
// - Upload
// - Media
// - NODES section:
//   - Text
//   - Image Generator
//   - Video Generator
//   - Assistant
//   - Image Upscaler
// - UTILITIES section (expandível)
```

### 4. src/components/studio/StudioPanel.tsx
```typescript
// Painel lateral direito
// Muda conforme o nó selecionado
// Formulários para cada tipo de nó
```

### 5. src/components/studio/nodes/ImageGeneratorNode.tsx
```typescript
// Nó de geração de imagem
// Preview da imagem gerada
// Status de geração
// Conexões de entrada/saída
```

### 6. src/components/studio/nodes/VideoGeneratorNode.tsx
```typescript
// Nó de geração de vídeo
// Aceita imagem como input
// Preview do vídeo
// Configurações de motion
```

### 7. src/components/studio/nodes/AssistantNode.tsx
```typescript
// Nó de assistente IA
// Chat integrado
// Seleção de modelo
// System prompt
```

### 8. src/components/studio/nodes/TextNode.tsx
```typescript
// Nó de texto simples
// Editor de texto
// Formatação básica
```

### 9. src/components/studio/nodes/ImageNode.tsx
```typescript
// Nó de imagem estática
// Upload ou URL
// Resize
```

### 10. src/components/studio/nodes/UpscalerNode.tsx
```typescript
// Nó de upscale de imagem
// Input: imagem
// Output: imagem melhorada
```

### 11. src/services/freepikService.ts
```typescript
export const freepikService = {
  // Configuração
  setApiKey: (key: string) => {...},
  
  // Modelos
  getImageModels: async () => {...},
  getVideoModels: async () => {...},
  
  // Geração de Imagem
  generateImage: async (params: {
    prompt: string;
    model: string;
    aspectRatio: string;
    style?: string;
    referenceImage?: string;
  }) => {...},
  
  // Geração de Vídeo
  generateVideo: async (params: {
    sourceImage: string;
    motionPrompt: string;
    model: string;
    duration: '5' | '10';
    aspectRatio: string;
  }) => {...},
  
  // Upscale
  upscaleImage: async (params: {
    image: string;
    scale: 2 | 4;
  }) => {...},
  
  // Status
  checkStatus: async (jobId: string) => {...},
};
```

### 12. src/store/studioStore.ts
```typescript
interface StudioState {
  // Projeto atual
  projectId: string | null;
  projectName: string;
  
  // React Flow
  nodes: Node[];
  edges: Edge[];
  
  // UI
  selectedNodeId: string | null;
  isPanelOpen: boolean;
  zoom: number;
  
  // Geração
  generatingNodes: string[]; // IDs de nós gerando
  
  // Actions
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (id: string, data: any) => void;
  deleteNode: (id: string) => void;
  connectNodes: (source: string, target: string) => void;
  setSelectedNode: (id: string | null) => void;
  // ... mais actions
}
```

## 🔄 FLUXO DE GERAÇÃO

```
1. Usuário arrasta "Image Generator" para o canvas
   └─> Cria nó vazio

2. Seleciona o nó
   └─> Abre painel lateral direito
   └─> Configura: modelo, prompt, aspect ratio

3. Clica "Generate"
   └─> Nó mostra "Generating..."
   └─> Chama API do Freepik
   └─> Atualiza preview quando pronto

4. Arrasta "Video Generator" e conecta
   └─> Nó de vídeo recebe imagem do nó anterior
   └─> Configura motion prompt

5. Clica "Generate" no vídeo
   └─> Transforma imagem em vídeo
   └─> Preview do vídeo no nó

6. Exporta
   └─> Download individual ou em lote
```

---

# ═══════════════════════════════════════════════════════════════
# PARTE 3: WORKFLOW PROFISSIONAL (IGUAL MLABS)
# ═══════════════════════════════════════════════════════════════

## 🎯 OBJETIVO
Implementar sistema de workflow completo igual mLabs com:
- Criação de demanda em etapas
- Seleção de equipe responsável
- Tela de criação de conteúdo
- Aprovação interna e externa
- Agendamento automático
- Publicação nas redes sociais

## 📊 ESTRUTURA DO BANCO DE DADOS (SUPABASE)

### Tabela: workflow_demands (ATUALIZAR)
```sql
-- Adicionar novos campos à tabela existente
ALTER TABLE demands ADD COLUMN IF NOT EXISTS
  -- Campos de conteúdo
  caption TEXT,
  hashtags TEXT,
  first_comment TEXT,
  
  -- Campos de mídia
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}', -- 'image', 'video', 'carousel'
  
  -- Campos de publicação
  channels TEXT[] DEFAULT '{}', -- 'instagram', 'facebook', 'tiktok', etc
  scheduled_date DATE,
  scheduled_time TIME,
  auto_schedule BOOLEAN DEFAULT false,
  
  -- Campos de aprovação
  internal_approvers UUID[] DEFAULT '{}',
  external_approvers UUID[] DEFAULT '{}', -- client_ids
  internal_approval_status JSONB DEFAULT '{}', -- {user_id: 'approved'|'rejected'|'pending'}
  external_approval_status JSONB DEFAULT '{}',
  approval_link UUID DEFAULT gen_random_uuid(),
  
  -- Configurações avançadas (Instagram)
  instagram_shop BOOLEAN DEFAULT false,
  disable_comments BOOLEAN DEFAULT false,
  collaborator TEXT,
  location TEXT,
  tagged_users TEXT[] DEFAULT '{}',
  alt_text TEXT,
  
  -- Equipe
  team_members JSONB DEFAULT '[]', -- [{user_id, role: 'redator'|'designer'|'acesso_total'}]
  
  -- Tracking
  text_ready BOOLEAN DEFAULT false,
  design_ready BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX idx_demands_approval_link ON demands(approval_link);
CREATE INDEX idx_demands_scheduled ON demands(scheduled_date, scheduled_time);
```

### Tabela: workflow_history
```sql
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL, -- 'created', 'moved', 'approved', 'rejected', 'scheduled', etc
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_history_demand ON workflow_history(demand_id);
```

### Tabela: workflow_notifications
```sql
CREATE TABLE workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  demand_id UUID REFERENCES demands(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'approval_needed', 'approved', 'rejected', 'scheduled', etc
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON workflow_notifications(user_id, is_read);
```

## 🎨 LAYOUT DO WORKFLOW

### Tela 1: Criar Demanda - Conteúdo
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ═══ Workflow                                                                │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🟠 Preencha os campos para criar uma demanda:                           │ │
│ │                                                                         │ │
│ │ ① ─────────────── CONTEÚDO ─────────────── ② Equipe                    │ │
│ │                                                                         │ │
│ │ 1. Título da demanda                                                    │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Post de Natal - Cliente X                                           │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 2. Perfil ℹ️                                                            │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Buscar perfil...                                              ▼     │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 3. Em quais canais será publicado?                                      │ │
│ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │ │
│ │ │ 📸 │ │ 📸 │ │ 📘 │ │ 🎵 │ │ 💼 │ │ 🐦 │ │ 📌 │ │ ▶️  │ │ 💬 │        │ │
│ │ │Feed│ │Reel│ │ FB │ │TikT│ │ In │ │ X  │ │Pin │ │ YT │ │Thre│        │ │
│ │ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │ │
│ │                                                                         │ │
│ │ 4. Data prevista para publicação                                        │ │
│ │ ┌───────────────────┐ ┌───────────────────┐                            │ │
│ │ │ 📅 __/__/____     │ │ 🕐 00:00          │                            │ │
│ │ └───────────────────┘ └───────────────────┘                            │ │
│ │                                                                         │ │
│ │ 5. Agendamento automático                                               │ │
│ │ ┌────┐                                                                  │ │
│ │ │ 🔘 │ Demanda será agendada automaticamente após aprovação            │ │
│ │ └────┘                                                                  │ │
│ │                                                                         │ │
│ │ 6. Tags                                                                 │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ natal, promoção, dezembro                                           │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 7. Briefing                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [B] [I] [U] [S] [❝] [•] [1.] [🔗] [📎] [↔️] [≡]              [A▼] │ │ │
│ │ │                                                                     │ │ │
│ │ │ Criar post de natal para o cliente X...                            │ │ │
│ │ │                                                                     │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 8. Anexos                                                               │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │                          ☁️ Upload                                   │ │ │
│ │ │       Selecione um arquivo ou arraste o arquivo aqui.               │ │ │
│ │ │       Formatos: DOCX, PDF, GIF, PNG ou JPG                          │ │ │
│ │ │       Tamanho: até 50mb                                             │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ← Voltar              [📄 Salvar como rascunho]      [Avançar →]       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tela 2: Criar Demanda - Equipe
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ═══ Workflow                                                                │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 👥 Selecione a equipe que trabalhará nesta demanda:          [+ Novo]  │ │
│ │                                                                         │ │
│ │ ① Conteúdo ─────────────── ② ─────────── EQUIPE ───────────────        │ │
│ │                                                                         │ │
│ │ 1. Selecione a equipe de criação:                                       │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🔍 Buscar usuário...                                                │ │ │
│ │ ├─────────────────────────────────────────────────────────────────────┤ │ │
│ │ │ ☐ Agência base          [Redator] [Designer] [🌐 Acesso total] ✏️  │ │ │
│ │ │ ☐ Kendy Produções       [Redator] [Designer] [🌐 Acesso total] ✏️  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 2. Selecione até 2 aprovadores internos:                                │ │
│ │ ┌────┐                                                                  │ │
│ │ │ 🔘 │ Demanda não necessita de aprovação interna                      │ │
│ │ └────┘                                                                  │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🔍 Buscar usuário...                                                │ │ │
│ │ ├─────────────────────────────────────────────────────────────────────┤ │ │
│ │ │ ☐ Agência base                              [🌐 Acesso total] ✏️   │ │ │
│ │ │ ☐ Kendy Produções                           [🌐 Acesso total] ✏️   │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ 3. Selecione até 2 clientes (aprovadores externos):                     │ │
│ │ ┌────┐                                                                  │ │
│ │ │ 🔘 │ Demanda não necessita de aprovação do cliente                   │ │
│ │ └────┘                                                                  │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🔍 Buscar usuário...                                                │ │ │
│ │ ├─────────────────────────────────────────────────────────────────────┤ │ │
│ │ │ ☐ Agência base                              [🌐 Acesso total] ✏️   │ │ │
│ │ │ ☐ Kendy Produções                           [🌐 Acesso total] ✏️   │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ ← Voltar              [📄 Salvar como rascunho]      [✓ Finalizar]     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tela 3: Criar Conteúdo (Designer)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                         [⚙️ Configs avançadas]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. Selecione perfis          │ 2. Selecione canais     │ Preview           │
│ ┌──────────────────────────┐ │ ┌─────────────────────┐ │ ┌───────────────┐ │
│ │ 📸 Grupo Manchester   ▼  │ │ │ 📸 📸 📘 📌 ▶️ 💬  │ │ │ 📱 Preview    │ │
│ └──────────────────────────┘ │ └─────────────────────┘ │ │               │ │
│                              │                         │ │ ┌───────────┐ │ │
│ 3. Texto do post             │ 4. Mídias               │ │ │ Instituto │ │ │
│ ┌──────────────────────────┐ │ ┌─────────────────────┐ │ │ │ Tarcísio  │ │ │
│ │ Todos 📸              🗑️ │ │ │ 📷 Editor          │ │ │ │           │ │ │
│ ├──────────────────────────┤ │ │ 🎨 Canva           │ │ │ │  [imagem] │ │ │
│ │ [Criar legenda - IA✨]   │ │ │ 📤 Upload          │ │ │ │           │ │ │
│ ├──────────────────────────┤ │ ├─────────────────────┤ │ │ └───────────┘ │ │
│ │                          │ │ │ 1 imagens, 0 vídeos │ │ │               │ │
│ │ Digite o seu texto...    │ │ │                     │ │ │ ❤️ 💬 📤 🔖  │ │
│ │                          │ │ │ Imagens, vídeos ou  │ │ │               │ │
│ │                          │ │ │ documentos          │ │ │ 50 comentários│ │
│ │ ● 🔍                     │ │ │ Envie arquivos...   │ │ │ teste         │ │
│ │ < Grupo Manchester    >  │ │ │                     │ │ │               │ │
│ │                          │ │ └─────────────────────┘ │ └───────────────┘ │
│ │ Digite hashtags...       │ │                         │                   │
│ │                          │ │ 5. Data e horário       │ << Ver todos      │
│ │ 0 hashtags         2000  │ │ ┌─────────────────────┐ │                   │
│ └──────────────────────────┘ │ │ 📸 15/12/2025 09:00 │ │                   │
│ [✨][🔗][#][📄][🔄][≡]      │ │ [+ Incluir mais]    │ │                   │
│                              │ └─────────────────────┘ │                   │
│                              │                         │                   │
├──────────────────────────────┴─────────────────────────┴───────────────────┤
│                                                                             │
│ [💾 Salvar e continuar depois] [🎨 Enviar p/ designer] [📝 Enviar p/ redator] [✅ Enviar p/ aprovação] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tela 4: Configurações Avançadas (Instagram)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Voltar                    Instagram 📸                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ É necessário o envio de alguma mídia para marcar as pessoas.               │
│                                                                             │
│ 💬 Desativar comentários                                                    │
│                                                                             │
│ 🛒 Instagram shop                                                           │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ ℹ️ Se você já utiliza o Instagram Shopping,                  │         │
│    │    clique aqui para marcar seus produtos no                 │         │
│    │    post. Para saber como ativar esse                        │         │
│    │    recurso do Instagram, veja este artigo                   │         │
│    │                                                             │         │
│    │    [Não exibir mais]  [Próximo]                             │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│ 💬 Primeiro comentário                                                      │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ Digite o primeiro comentário...                             │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│ 👥 Colaborador                                                              │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ @username do colaborador                                    │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│ 📍 Localização                                                              │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ Buscar localização...                                       │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│ 👤 Marcação de pessoas                                                      │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ @username1, @username2...                                   │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│ 📝 Texto alternativo                                                        │
│    ┌─────────────────────────────────────────────────────────────┐         │
│    │ Descrição da imagem para acessibilidade...                  │         │
│    └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
│                                              [< Salvar e voltar]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tela 5: Kanban do Workflow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ═══ Workflow                              [📋 Lista] [🔲 Kanban] [⚙️] [+ Adicionar demanda] │
│ Gerencie demandas de conteúdo                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Período              │ Perfil              │ Status              │ 🔍 Filtro │
│ [14/12 - 21/12/2025] │ [Todos ▼]          │ [Todos ▼]          │ avançado  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐
│ │📋      │ │🟠 Conteúdo │ │🟠 Aprovação│ │🟡 Aprovação│ │✏️ Ajustes  │ │📅 Aguard.  │ │✅ Aprovado │ │✓ Concluí-│
│ │Rascunho│ │    (2)     │ │  Interna   │ │  Cliente   │ │            │ │ Agendamento│ │ e agendado │ │   das    │
│ │   (1)  │ │            │ │    (0)     │ │    (1)     │ │    (0)     │ │    (0)     │ │    (0)     │ │   (0)    │
│ ├────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├──────────┤
│ │        │ │ Depoimento1│ │            │ │ FINI SONHOS│ │            │ │            │ │            │ │          │
│ │ TEste  │ │ ┌────────┐ │ │            │ │ ┌────────┐ │ │            │ │            │ │            │ │          │
│ │ ┌────┐ │ │ │ℹ️ ITB  │ │ │            │ │ │NC Nechio│ │ │            │ │            │ │            │ │          │
│ │ │ 📎 │ │ │ │ 📸     │ │ │            │ │ │ 📸     │ │ │            │ │            │ │            │ │          │
│ │ └────┘ │ │ │15/12/25│ │ │            │ │ │[imagem]│ │ │            │ │            │ │            │ │          │
│ │        │ │ │ 09:00  │ │ │            │ │ │        │ │ │            │ │            │ │            │ │          │
│ │ 🏷️     │ │ │Aguard. │ │ │            │ │ │Ver mídia│ │            │ │            │ │            │ │          │
│ │Redator │ │ │texto ✓ │ │ │            │ │ │18/12 7h│ │ │            │ │            │ │            │ │          │
│ │        │ │ │Aguard. │ │ │            │ │ │        │ │ │            │ │            │ │            │ │          │
│ │    >   │ │ │design ✓│ │ │    >       │ │ │🔗 Link │ │ │    >       │ │    >       │ │    >       │ │    >     │
│ │        │ │ └────────┘ │ │            │ │ │aprovação│ │            │ │            │ │            │ │          │
│ │        │ │            │ │            │ │ └────────┘ │ │            │ │            │ │            │ │          │
│ │        │ │ Depoimento2│ │            │ │            │ │            │ │            │ │            │ │          │
│ │        │ │ ...        │ │            │ │ [Carregar │ │            │ │            │ │            │ │          │
│ │        │ │            │ │            │ │  mais]    │ │            │ │            │ │            │ │          │
│ └────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tela 6: Card Expandido no Kanban
```
┌────────────────────────────────┐
│ 🟡 Aprovação do cliente    1 < │
├────────────────────────────────┤
│                                │
│ teste                      🗑️  │
│                                │
│ GM Grupo Manchester            │
│ 📸                             │
│                                │
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │       [Imagem/Mídia]       │ │
│ │                            │ │
│ │              Ver mídia ↗️   │ │
│ └────────────────────────────┘ │
│                                │
│ 📅 10/12/2025 às 05:00         │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🔗 Link de aprovação       │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🔄 Carregar mais           │ │
│ └────────────────────────────┘ │
│                                │
└────────────────────────────────┘
```

### Tela 7: Modal de Link de Aprovação
```
┌─────────────────────────────────────────────────────────────┐
│                                              Fechar X       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         🔗                                  │
│                                                             │
│                  Link de aprovação                          │
│                                                             │
│     Qualquer pessoa na Internet com o link pode            │
│     realizar a aprovação.                                   │
│     Compartilhe-o apenas com o 1º aprovador da demanda:    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Agência base                    🟠 Aguardando       │   │
│  │ contato@agenciabase.tech           aprovação        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔗 https://agenciabase.tech/approve/6e9e0...        │   │
│  │                                                      │   │
│  │                    [📋 Copiar link]  [💬 WhatsApp]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                   🔗 Link de aprovação                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tela 8: Página Externa de Aprovação
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                   🌐 ▼      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 🔗 Este link é de uso pessoal do aprovador da demanda:                      │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Agência base                            ⚠️ 1 demanda(s) com aprovação   │ │
│ │ contato@agenciabase.tech                   pendente.                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ 🟡 Aprovação                              1 / 1                  🔍 Filtros │
│                                                                             │
│                    ┌─────────────────────────────────────────┐              │
│         <          │ teste                                   │      >       │
│                    │ ─────────────────────────────────────── │              │
│                    │      < Grupo Manchester >               │              │
│                    │                                         │              │
│                    │ 📅 Data da publicação:                  │              │
│                    │ 🔴 10/12/2025 às 05:00                  │              │
│                    │                                         │              │
│                    │ ┌─────────────────────────────────────┐ │              │
│                    │ │                                     │ │              │
│                    │ │         [Imagem/Preview]            │ │              │
│                    │ │                                     │ │              │
│                    │ │                      Ver mídia ↗️    │ │              │
│                    │ └─────────────────────────────────────┘ │              │
│                    │                                         │              │
│                    │ teste                                   │              │
│                    │ (legenda do post)                       │              │
│                    └─────────────────────────────────────────┘              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    [✓✓ Aprovar todas]     [✅ Aprovar]          [✏️ Ajustar]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📂 ARQUIVOS A CRIAR/MODIFICAR

### 1. src/pages/WorkflowPage.tsx (REFATORAR COMPLETAMENTE)
```typescript
// Layout com todas as etapas do mLabs
// Modal de criação em etapas
// Kanban com todas as colunas
// Filtros avançados
```

### 2. src/components/workflow/CreateDemandModal.tsx (NOVO)
```typescript
// Modal de criação de demanda
// Etapa 1: Conteúdo (título, perfil, canais, data, tags, briefing, anexos)
// Etapa 2: Equipe (criação, aprovadores internos, aprovadores externos)
```

### 3. src/components/workflow/ContentCreatorPage.tsx (NOVO)
```typescript
// Tela completa de criação de conteúdo
// Seleção de perfis e canais
// Editor de texto com formatação
// Upload de mídias
// Preview do post
// Configurações avançadas
// Botões de ação (salvar, enviar p/ designer, enviar p/ aprovação)
```

### 4. src/components/workflow/AdvancedSettingsModal.tsx (NOVO)
```typescript
// Configurações avançadas por plataforma
// Instagram: shop, comentários, colaborador, localização, marcações, alt text
// Facebook: específicas do FB
// TikTok: específicas do TikTok
// etc.
```

### 5. src/components/workflow/KanbanBoard.tsx (REFATORAR)
```typescript
// Kanban com 8 colunas:
// - Rascunho
// - Conteúdo
// - Aprovação Interna
// - Aprovação Cliente
// - Ajustes
// - Aguardando Agendamento
// - Aprovado e Agendado
// - Concluídas

// Drag and drop entre colunas
// Regras de movimentação automática
```

### 6. src/components/workflow/DemandCard.tsx (REFATORAR)
```typescript
// Card de demanda no kanban
// Preview de mídia
// Status de texto/design
// Data agendada
// Botão de link de aprovação
// Expandir para detalhes
```

### 7. src/components/workflow/ApprovalLinkModal.tsx (NOVO)
```typescript
// Modal com link de aprovação
// Copiar link
// Compartilhar no WhatsApp
// Status de aprovação
```

### 8. src/pages/ExternalApprovalPage.tsx (NOVO)
```typescript
// Página pública de aprovação
// Rota: /approve/:token
// Lista de demandas pendentes
// Aprovar/Ajustar demandas
// Comentários de ajuste
```

### 9. src/services/workflowService.ts (NOVO/REFATORAR)
```typescript
export const workflowService = {
  // Demandas
  createDemand: async (data: CreateDemandDTO) => {...},
  updateDemand: async (id: string, data: UpdateDemandDTO) => {...},
  deleteDemand: async (id: string) => {...},
  getDemands: async (filters: DemandFilters) => {...},
  
  // Movimentação
  moveDemand: async (id: string, toStatus: string) => {...},
  
  // Aprovação
  generateApprovalLink: async (demandId: string, clientId: string) => {...},
  getApprovalData: async (token: string) => {...},
  approveDemand: async (token: string, demandId: string) => {...},
  requestAdjustment: async (token: string, demandId: string, comment: string) => {...},
  
  // Agendamento
  scheduleDemand: async (demandId: string, date: Date, time: string) => {...},
  publishDemand: async (demandId: string) => {...}, // Integração com Late API
  
  // Notificações
  sendNotification: async (userId: string, notification: NotificationDTO) => {...},
  getNotifications: async (userId: string) => {...},
  markAsRead: async (notificationId: string) => {...},
};
```

### 10. src/services/socialPublishService.ts (NOVO)
```typescript
// Integração com Late API ou similar para publicação
export const socialPublishService = {
  // Conectar contas
  connectInstagram: async (credentials: any) => {...},
  connectFacebook: async (credentials: any) => {...},
  connectTikTok: async (credentials: any) => {...},
  
  // Publicar
  publish: async (demandId: string, platforms: string[]) => {...},
  schedulePublish: async (demandId: string, platforms: string[], scheduledAt: Date) => {...},
  
  // Status
  getPublishStatus: async (demandId: string) => {...},
};
```

## 🔄 FLUXO AUTOMÁTICO DE MOVIMENTAÇÃO

```
CRIAÇÃO:
1. Demanda criada → Status: "Rascunho" (se salvar como rascunho)
                 → Status: "Conteúdo" (se finalizar)

CRIAÇÃO DE CONTEÚDO:
2. Designer adiciona mídia → text_ready = false, design_ready = true
3. Redator adiciona texto → text_ready = true, design_ready = false
4. Ambos prontos → Botão "Enviar p/ aprovação" habilitado

APROVAÇÃO INTERNA:
5. Enviar p/ aprovação interna → Status: "Aprovação Interna"
6. Todos aprovadores internos aprovam → Status: "Aprovação Cliente"
7. Algum rejeita → Status: "Ajustes" + notificação

APROVAÇÃO CLIENTE:
8. Link enviado ao cliente
9. Cliente aprova → Status: "Aprovado e Agendado" (se auto_schedule)
                → Status: "Aguardando Agendamento" (se manual)
10. Cliente pede ajuste → Status: "Ajustes" + notificação

PUBLICAÇÃO:
11. Data/hora chegou → Publica automaticamente → Status: "Concluídas"
```

---

# ═══════════════════════════════════════════════════════════════
# CONFIGURAÇÕES DE API
# ═══════════════════════════════════════════════════════════════

## Adicionar na página de Configurações (SettingsPage.tsx):

```typescript
interface APIConfig {
  // Existentes
  gemini_key?: string;
  openrouter_key?: string;
  
  // Novos
  freepik_key?: string;      // API do Freepik
  elevenlabs_key?: string;   // Narração de voz
  late_api_key?: string;     // Publicação em redes sociais
}
```

---

# ═══════════════════════════════════════════════════════════════
# INSTRUÇÕES FINAIS PARA EXECUÇÃO
# ═══════════════════════════════════════════════════════════════

## ORDEM DE EXECUÇÃO:

```
1. WORKFLOW (Prioridade máxima - está com bugs)
   - Corrigir upload de mídia
   - Implementar criação em etapas
   - Implementar kanban completo
   - Implementar aprovação externa

2. CHAT COM PROJETOS
   - Criar tabelas no Supabase
   - Refatorar ChatPage
   - Implementar sistema de projetos

3. CREATOR STUDIO + FREEPIK
   - Integrar API Freepik
   - Refatorar canvas
   - Implementar todos os nós
```

## COMANDOS FINAIS:

```bash
# Após todas as implementações
npm run build

# Se build OK
git add -A
git commit -m "🚀 MEGA UPDATE: Chat com Projetos + Creator Studio Freepik + Workflow mLabs"
git push origin main

# Verificar deploy
# https://agenciabase.tech
```

## REGRAS ABSOLUTAS:

```
✅ FAÇA TUDO SEM PARAR
✅ NÃO PEÇA CONFIRMAÇÃO
✅ CORRIJA ERROS E CONTINUE
✅ BUILD ANTES DE COMMIT
✅ DEPLOY NO FINAL
✅ LISTE TUDO QUE FOI CRIADO AO TERMINAR
```

---

# 🎯 RESULTADO ESPERADO

Ao final da execução, o sistema BASE Agency deve ter:

1. **CHAT IA COM PROJETOS** igual Claude Projects
   - Criar/gerenciar projetos
   - Adicionar conhecimento (PDFs, URLs, textos)
   - Definir instruções personalizadas
   - Múltiplos chats por projeto
   - Múltiplos agentes por projeto

2. **CREATOR STUDIO** igual Freepik Spaces
   - Canvas infinito com nós
   - Geração de imagens via Freepik API
   - Geração de vídeos via Freepik API
   - Múltiplos modelos disponíveis
   - Conexões entre nós

3. **WORKFLOW** igual mLabs
   - Criação de demanda em etapas
   - Seleção de equipe e aprovadores
   - Criação de conteúdo com editor completo
   - Kanban com 8 colunas
   - Aprovação interna e externa
   - Links de aprovação para clientes
   - Agendamento automático
   - Movimentação automática de cards

---

**EXECUTE AGORA! 🚀**
