// n8n MCP Client - Script para configurar n8n automaticamente
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
        console.log('Status:', res.statusCode);
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Error:', e.message);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Conectando ao n8n MCP Server...');
  console.log('='.repeat(60));
  
  try {
    // Listar ferramentas disponíveis
    console.log('\n📋 Listando ferramentas MCP...');
    const tools = await mcpRequest('tools/list');
    console.log('Ferramentas:', JSON.stringify(tools, null, 2));
    
    if (tools.result && tools.result.tools) {
      console.log('\n✅ Ferramentas disponíveis:');
      tools.result.tools.forEach(t => {
        console.log(`   - ${t.name}: ${t.description || ''}`);
      });
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

main();
