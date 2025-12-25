const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, 'n8n-workflows');

const WORKFLOWS = [
  '01-notificacao-email-status.json',
  '02-notificacao-whatsapp-evolution.json', 
  '03-webhook-aprovacao-cliente.json',
  '04-autenticacao-login.json',
  '05-agendamento-publicacao.json',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BASE Agency - Importando workflows no n8n');
  console.log('='.repeat(60));

  // Conectar ao Chrome na porta 9222
  console.log('\n🔗 Conectando ao Chrome...');
  
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.log('❌ Chrome não está com debug habilitado.');
    console.log('   Feche o Chrome e execute:');
    console.log('   start chrome --remote-debugging-port=9222');
    return;
  }

  const pages = await browser.pages();
  console.log(`📑 ${pages.length} abas abertas`);
  
  // Encontrar aba do n8n
  let page = null;
  for (const p of pages) {
    const url = await p.url();
    if (url.includes('n8n.cloud') && !url.includes('signin')) {
      page = p;
      console.log('✅ Aba n8n encontrada:', url);
      break;
    }
  }

  if (!page) {
    page = pages[0];
    console.log('⚠️ Usando primeira aba');
  }

  await page.bringToFront();
  
  // Verificar se está na página correta
  const currentUrl = await page.url();
  console.log('📍 URL atual:', currentUrl);

  if (!currentUrl.includes('n8n.cloud') || currentUrl.includes('signin')) {
    console.log('⚠️ Navegando para n8n...');
    await page.goto('https://agenciabase.app.n8n.cloud/home/workflows', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await sleep(3000);
  }

  // IMPORTAR WORKFLOWS
  for (let i = 0; i < WORKFLOWS.length; i++) {
    const workflowFile = WORKFLOWS[i];
    const filePath = path.join(WORKFLOWS_DIR, workflowFile);
    
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📦 [${i+1}/${WORKFLOWS.length}] ${workflowFile}`);
    console.log('─'.repeat(50));
    
    try {
      // 1. Clicar no botão "Create workflow" (verde)
      console.log('   1️⃣ Clicando em Create workflow...');
      
      await page.waitForSelector('button', { timeout: 5000 });
      
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          if (btn.textContent.includes('Create workflow') || btn.textContent.includes('Create')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        console.log('   ✅ Botão clicado!');
      } else {
        console.log('   ⚠️ Botão não encontrado');
      }
      
      await sleep(2000);

      // 2. Procurar opção Import from File no menu
      console.log('   2️⃣ Abrindo menu de importação...');
      
      // Tentar dropdown do botão Create
      await page.evaluate(() => {
        const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [role="menu"]');
        dropdowns.forEach(d => {
          const items = d.querySelectorAll('li, [role="menuitem"], [class*="item"]');
          items.forEach(item => {
            if (item.textContent.toLowerCase().includes('import')) {
              item.click();
            }
          });
        });
      });
      
      await sleep(1500);

      // 3. Upload do arquivo JSON
      console.log('   3️⃣ Fazendo upload do arquivo...');
      
      // Tornar input visível
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="file"]');
        inputs.forEach(input => {
          input.style.display = 'block';
          input.style.visibility = 'visible';
          input.style.opacity = '1';
          input.style.position = 'fixed';
          input.style.top = '0';
          input.style.left = '0';
          input.style.zIndex = '99999';
        });
      });
      
      await sleep(500);
      
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(filePath);
        console.log('   ✅ Arquivo enviado!');
        await sleep(3000);
      } else {
        // Tentar colar o JSON diretamente
        console.log('   📋 Tentando colar JSON...');
        const jsonContent = fs.readFileSync(filePath, 'utf8');
        
        // Pressionar Ctrl+V com o JSON na área de transferência
        await page.evaluate((json) => {
          navigator.clipboard.writeText(json);
        }, jsonContent);
        
        await page.keyboard.down('Control');
        await page.keyboard.press('v');
        await page.keyboard.up('Control');
        await sleep(2000);
      }

      // 4. Confirmar importação se houver modal
      console.log('   4️⃣ Confirmando importação...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('import') || text.includes('confirm') || text.includes('yes') || text.includes('ok')) {
            btn.click();
            return;
          }
        }
      });
      await sleep(2000);

      // 5. Salvar workflow (Ctrl+S)
      console.log('   5️⃣ Salvando...');
      await page.keyboard.down('Control');
      await page.keyboard.press('s');
      await page.keyboard.up('Control');
      await sleep(2000);

      // 6. Ativar workflow
      console.log('   6️⃣ Ativando workflow...');
      await page.evaluate(() => {
        const toggles = document.querySelectorAll('[class*="toggle"], [class*="switch"], [role="switch"]');
        if (toggles.length > 0) {
          toggles[0].click();
        }
      });
      await sleep(1500);

      // 7. Voltar para lista
      console.log('   7️⃣ Voltando para lista...');
      await page.goto('https://agenciabase.app.n8n.cloud/home/workflows', { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      await sleep(2000);

      console.log(`   ✅ ${workflowFile} - CONCLUÍDO!`);

    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      // Tentar voltar para a lista
      try {
        await page.goto('https://agenciabase.app.n8n.cloud/home/workflows', { timeout: 10000 });
        await sleep(2000);
      } catch (e) {}
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ IMPORTAÇÃO FINALIZADA!');
  console.log('='.repeat(60));
  console.log('\n📌 Verifique os workflows no n8n');
  console.log('🔗 O Chrome continua aberto');
}

main().catch(console.error);
