// n8n REST API Client - Criar workflows via API
const https = require('https');
const fs = require('fs');
const path = require('path');

// VOCÊ PRECISA GERAR UMA API KEY:
// 1. Acesse https://agenciabase.app.n8n.cloud
// 2. Clique no seu avatar > Settings
// 3. Vá em "API" 
// 4. Clique "Create an API Key"
// 5. Cole aqui
const N8N_API_KEY = 'COLE_SUA_API_KEY_AQUI';
const N8N_BASE_URL = 'https://agenciabase.app.n8n.cloud';

function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_BASE_URL}/api/v1${endpoint}`);
    
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`[${method}] ${endpoint} -> ${res.statusCode}`);
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function createWorkflow(workflowData) {
  console.log(`\n📦 Criando workflow: ${workflowData.name}...`);
  const result = await apiRequest('/workflows', 'POST', workflowData);
  
  if (result.status === 200 || result.status === 201) {
    console.log(`   ✅ Criado! ID: ${result.data.id}`);
    
    // Ativar workflow
    console.log(`   🔄 Ativando...`);
    const activate = await apiRequest(`/workflows/${result.data.id}/activate`, 'POST');
    if (activate.status === 200) {
      console.log(`   🟢 Ativado!`);
    }
    
    return result.data;
  } else {
    console.log(`   ❌ Erro: ${JSON.stringify(result.data)}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BASE Agency - Criando workflows no n8n');
  console.log('='.repeat(60));
  
  if (N8N_API_KEY === 'COLE_SUA_API_KEY_AQUI') {
    console.log('\n❌ ERRO: Você precisa configurar a API Key!');
    console.log('\n📝 Instruções:');
    console.log('   1. Acesse https://agenciabase.app.n8n.cloud');
    console.log('   2. Clique no seu avatar (canto inferior esquerdo)');
    console.log('   3. Vá em "Settings"');
    console.log('   4. Clique em "API" no menu lateral');
    console.log('   5. Clique "Create an API Key"');
    console.log('   6. Copie a chave e cole neste arquivo');
    console.log('   7. Execute novamente: node n8n-create-workflows.cjs');
    return;
  }
  
  // Verificar conexão
  console.log('\n🔗 Verificando conexão...');
  const test = await apiRequest('/workflows');
  
  if (test.status !== 200) {
    console.log('❌ Erro de conexão:', test.data);
    return;
  }
  
  console.log(`✅ Conectado! (${test.data.data?.length || 0} workflows existentes)`);
  
  // Carregar e criar workflows
  const workflowFiles = [
    './n8n-workflows/01-notificacao-email-status.json',
    './n8n-workflows/02-notificacao-whatsapp-evolution.json',
    './n8n-workflows/03-webhook-aprovacao-cliente.json',
    './n8n-workflows/04-autenticacao-login.json',
    './n8n-workflows/05-agendamento-publicacao.json',
  ];
  
  console.log('\n📋 Criando workflows...\n');
  
  for (const file of workflowFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      await createWorkflow(workflow);
    } else {
      console.log(`⚠️ Arquivo não encontrado: ${file}`);
    }
  }
  
  // Configurar variáveis de ambiente
  console.log('\n🔧 Configurando variáveis de ambiente...');
  
  const variables = [
    { key: 'EVOLUTION_API_URL', value: 'https://sua-evolution.com' },
    { key: 'EVOLUTION_API_KEY', value: 'sua-api-key' },
    { key: 'EVOLUTION_INSTANCE', value: 'agenciabase' },
    { key: 'TEAM_WHATSAPP', value: '5511999999999' },
    { key: 'LATE_API_KEY', value: 'sk_c97f6c3195c89bb4cb16548c2b0c2be269f97bbb4c3e594e08b1128152935aef' },
    { key: 'JWT_SECRET', value: 'base-agency-jwt-secret-2024' },
  ];
  
  for (const v of variables) {
    const result = await apiRequest('/variables', 'POST', v);
    if (result.status === 200 || result.status === 201) {
      console.log(`   ✅ ${v.key}`);
    } else {
      // Tentar atualizar se já existe
      const update = await apiRequest(`/variables/${v.key}`, 'PATCH', { value: v.value });
      if (update.status === 200) {
        console.log(`   ✅ ${v.key} (atualizada)`);
      } else {
        console.log(`   ⚠️ ${v.key}: ${result.data.message || 'erro'}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ CONFIGURAÇÃO CONCLUÍDA!');
  console.log('='.repeat(60));
  console.log('\n🔗 Acesse: https://agenciabase.app.n8n.cloud');
  console.log('\n📌 Webhooks criados:');
  console.log('   - /webhook/status-changed-email');
  console.log('   - /webhook/whatsapp-notify');
  console.log('   - /webhook/client-approval');
  console.log('   - /webhook/auth/login');
  console.log('   - /webhook/schedule-publish');
}

main().catch(console.error);
