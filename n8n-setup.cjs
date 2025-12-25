// n8n MCP Client - Criar todos os workflows automaticamente
const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_MCP_URL = 'https://agenciabase.app.n8n.cloud/mcp-server/http';
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YmE4Njk0MS02YmNiLTQwMmUtYThlNC02NTUxZTVhNGE3MzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjFiNTVkZmJmLTdkMWItNDljMC1hMjNiLTRhMmYzNWYxZWQ5NSIsImlhdCI6MTc2NjY2OTAxN30.N3-Sp-HdFytPYvZGERbtz0oMV2iWjg7foxwdIQe-GHc';

function mcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Date.now()
    });

    const url = new URL(N8N_MCP_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${N8N_TOKEN}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          // Parse SSE response
          if (body.includes('event: message')) {
            const dataMatch = body.match(/data: (.+)/);
            if (dataMatch) {
              resolve(JSON.parse(dataMatch[1]));
              return;
            }
          }
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function callTool(toolName, args) {
  console.log(`\n🔧 Chamando tool: ${toolName}`);
  const result = await mcpRequest('tools/call', {
    name: toolName,
    arguments: args
  });
  return result;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BASE Agency - Configurando n8n via MCP');
  console.log('='.repeat(60));
  
  try {
    // 1. Listar workflows existentes
    console.log('\n📋 Verificando workflows existentes...');
    const existing = await callTool('search_workflows', { limit: 50 });
    console.log('Resposta:', JSON.stringify(existing, null, 2));
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

main();
