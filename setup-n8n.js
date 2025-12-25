#!/usr/bin/env node
/**
 * BASE Agency - Script de Configuração Automática do n8n
 * 
 * Este script importa todos os workflows e configura as credenciais no n8n Cloud.
 * 
 * USO:
 * 1. Configure as variáveis abaixo
 * 2. Execute: node setup-n8n.js
 */

const N8N_CONFIG = {
  baseUrl: 'https://agenciabase.app.n8n.cloud',
  apiKey: 'SEU_API_KEY_DO_N8N', // Gerar em Settings > API > Create API Key
};

// Suas credenciais
const CREDENTIALS = {
  // Evolution API (WhatsApp)
  evolution: {
    url: 'https://sua-evolution-api.com',
    apiKey: 'sua-api-key',
    instance: 'agenciabase',
  },
  
  // SMTP (Email)
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'seu-email@gmail.com',
    password: 'sua-senha-de-app', // Usar senha de app do Google
  },
  
  // Late API
  lateApi: {
    apiKey: 'sk_c97f6c3195c89bb4cb16548c2b0c2be269f97bbb4c3e594e08b1128152935aef',
  },
  
  // WhatsApp da Equipe (para notificações)
  teamWhatsApp: '5511999999999',
  
  // JWT Secret
  jwtSecret: 'base-agency-jwt-secret-2024',
};

// Workflows para importar
const WORKFLOWS = [
  './n8n-workflows/01-notificacao-email-status.json',
  './n8n-workflows/02-notificacao-whatsapp-evolution.json',
  './n8n-workflows/03-webhook-aprovacao-cliente.json',
  './n8n-workflows/04-autenticacao-login.json',
  './n8n-workflows/05-agendamento-publicacao.json',
];

const fs = require('fs');
const path = require('path');

async function n8nRequest(endpoint, method = 'GET', body = null) {
  const url = `${N8N_CONFIG.baseUrl}/api/v1${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_CONFIG.apiKey,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API Error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function createCredential(name, type, data) {
  console.log(`📝 Criando credencial: ${name}...`);
  
  try {
    const result = await n8nRequest('/credentials', 'POST', {
      name,
      type,
      data,
    });
    console.log(`   ✅ Credencial "${name}" criada (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.log(`   ⚠️ Erro ao criar credencial: ${error.message}`);
    return null;
  }
}

async function importWorkflow(filePath) {
  const fileName = path.basename(filePath);
  console.log(`📦 Importando workflow: ${fileName}...`);
  
  try {
    const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const result = await n8nRequest('/workflows', 'POST', workflowData);
    console.log(`   ✅ Workflow "${result.name}" importado (ID: ${result.id})`);
    
    // Ativar workflow
    await n8nRequest(`/workflows/${result.id}/activate`, 'POST');
    console.log(`   🟢 Workflow ativado!`);
    
    return result;
  } catch (error) {
    console.log(`   ⚠️ Erro: ${error.message}`);
    return null;
  }
}

async function setEnvironmentVariables() {
  console.log('\n🔧 Configurando variáveis de ambiente...');
  
  const variables = {
    EVOLUTION_API_URL: CREDENTIALS.evolution.url,
    EVOLUTION_API_KEY: CREDENTIALS.evolution.apiKey,
    EVOLUTION_INSTANCE: CREDENTIALS.evolution.instance,
    TEAM_WHATSAPP: CREDENTIALS.teamWhatsApp,
    LATE_API_KEY: CREDENTIALS.lateApi.apiKey,
    JWT_SECRET: CREDENTIALS.jwtSecret,
  };
  
  for (const [key, value] of Object.entries(variables)) {
    try {
      await n8nRequest('/variables', 'POST', { key, value });
      console.log(`   ✅ ${key} configurada`);
    } catch (error) {
      // Variável pode já existir, tentar atualizar
      try {
        await n8nRequest(`/variables/${key}`, 'PATCH', { value });
        console.log(`   ✅ ${key} atualizada`);
      } catch (e) {
        console.log(`   ⚠️ ${key}: ${e.message}`);
      }
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BASE Agency - Configuração Automática do n8n');
  console.log('='.repeat(60));
  console.log('');
  
  // Verificar conexão
  console.log('🔗 Verificando conexão com n8n...');
  try {
    const health = await n8nRequest('/workflows');
    console.log(`   ✅ Conectado! (${health.data?.length || 0} workflows existentes)\n`);
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.log('\n⚠️ Verifique:');
    console.log('   1. A URL do n8n está correta');
    console.log('   2. O API Key foi gerado em Settings > API');
    console.log('   3. O n8n Cloud está acessível');
    process.exit(1);
  }
  
  // Criar credenciais
  console.log('📋 ETAPA 1: Criando credenciais...\n');
  
  await createCredential('SMTP - BASE Agency', 'smtp', {
    host: CREDENTIALS.smtp.host,
    port: CREDENTIALS.smtp.port,
    user: CREDENTIALS.smtp.user,
    password: CREDENTIALS.smtp.password,
    secure: false,
  });
  
  // Configurar variáveis
  console.log('\n📋 ETAPA 2: Configurando variáveis de ambiente...\n');
  await setEnvironmentVariables();
  
  // Importar workflows
  console.log('\n📋 ETAPA 3: Importando workflows...\n');
  
  for (const workflowPath of WORKFLOWS) {
    const fullPath = path.join(__dirname, workflowPath);
    if (fs.existsSync(fullPath)) {
      await importWorkflow(fullPath);
    } else {
      console.log(`   ⚠️ Arquivo não encontrado: ${workflowPath}`);
    }
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('✅ CONFIGURAÇÃO CONCLUÍDA!');
  console.log('='.repeat(60));
  console.log('\n📌 Próximos passos:');
  console.log('   1. Acesse https://agenciabase.app.n8n.cloud');
  console.log('   2. Verifique se os workflows estão ativos');
  console.log('   3. Teste os webhooks');
  console.log('\n🔗 Webhooks disponíveis:');
  console.log('   - /webhook/status-changed-email');
  console.log('   - /webhook/whatsapp-notify');
  console.log('   - /webhook/client-approval');
  console.log('   - /webhook/auth/login');
  console.log('   - /webhook/schedule-publish');
  console.log('');
}

main().catch(console.error);
