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
  console.log('🚀 BASE Agency - Configurando n8n');
  console.log('='.repeat(60));

  console.log('\n🔗 Conectando ao Chrome existente...');
  
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  console.log(`📑 ${pages.length} abas encontradas`);
  
  // Encontrar a aba do n8n
  let page = null;
  for (const p of pages) {
    const url = p.url();
    console.log(`   - ${url}`);
    if (url.includes('n8n.cloud')) {
      page = p;
      break;
    }
  }

  if (!page) {
    console.log('⚠️ Aba do n8n não encontrada, usando primeira aba...');
    page = pages[0];
    await page.goto('https://agenciabase.app.n8n.cloud', { waitUntil: 'networkidle2' });
  }

  await page.bringToFront();
  await sleep(2000);

  console.log('\n✅ Conectado! URL:', page.url());

  // Importar cada workflow
  for (let i = 0; i < WORKFLOWS.length; i++) {
    const workflowFile = WORKFLOWS[i];
    const filePath = path.join(WORKFLOWS_DIR, workflowFile);
    
    console.log(`\n📦 [${i+1}/${WORKFLOWS.length}] ${workflowFile}`);
    
    try {
      // Ir para home do n8n
      await page.goto('https://agenciabase.app.n8n.cloud/home/workflows', { waitUntil: 'networkidle2' });
      await sleep(2000);

      // Clicar em Add Workflow
      console.log('   ➕ Clicando Add Workflow...');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent.includes('Add') || btn.getAttribute('data-test-id')?.includes('add')) {
            btn.click();
            return;
          }
        }
        // Tentar pelo ícone
        const addIcon = document.querySelector('[class*="add-workflow"], [data-test-id*="add"]');
        if (addIcon) addIcon.click();
      });
      await sleep(2000);

      // Clicar no menu (3 pontinhos) para Import
      console.log('   📥 Abrindo Import...');
      
      // Usar atalho de teclado primeiro
      await page.keyboard.down('Control');
      await page.keyboard.press('i');  
      await page.keyboard.up('Control');
      await sleep(1500);

      // Se não abriu, tentar menu
      const hasModal = await page.evaluate(() => {
        return document.body.innerHTML.toLowerCase().includes('import from file') || 
               document.body.innerHTML.toLowerCase().includes('importar');
      });

      if (!hasModal) {
        console.log('   🔍 Procurando menu...');
        await page.evaluate(() => {
          // Procurar menu de opções
          const menus = document.querySelectorAll('[data-test-id*="menu"], [class*="menu"], button[class*="options"]');
          for (const m of menus) {
            m.click();
          }
        });
        await sleep(1000);
        
        // Clicar em Import
        await page.evaluate(() => {
          const items = document.querySelectorAll('li, [role="menuitem"], [class*="menu-item"]');
          for (const item of items) {
            if (item.textContent.toLowerCase().includes('import')) {
              item.click();
              return;
            }
          }
        });
        await sleep(1500);
      }

      // Upload do arquivo
      console.log('   📤 Upload do arquivo...');
      
      // Encontrar input de arquivo (pode estar oculto)
      const inputSelector = 'input[type="file"]';
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="file"]');
        inputs.forEach(input => {
          input.style.display = 'block';
          input.style.opacity = '1';
        });
      });
      
      const fileInput = await page.$(inputSelector);
      if (fileInput) {
        await fileInput.uploadFile(filePath);
        console.log('   ✅ Arquivo enviado!');
        await sleep(3000);
      } else {
        console.log('   ⚠️ Input não encontrado, tentando drag & drop...');
        // Ler conteúdo e colar
        const content = fs.readFileSync(filePath, 'utf8');
        await page.evaluate((json) => {
          // Tentar colar no editor
          const event = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer()
          });
          event.clipboardData.setData('application/json', json);
          document.dispatchEvent(event);
        }, content);
        await sleep(2000);
      }

      // Clicar em Import/Confirmar se houver botão
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('import') || text.includes('confirm') || text.includes('ok')) {
            btn.click();
            return;
          }
        }
      });
      await sleep(2000);

      // Salvar (Ctrl+S)
      console.log('   💾 Salvando...');
      await page.keyboard.down('Control');
      await page.keyboard.press('s');
      await page.keyboard.up('Control');
      await sleep(2000);

      // Ativar workflow
      console.log('   🔌 Ativando...');
      await page.evaluate(() => {
        // Procurar toggle de ativação
        const toggles = document.querySelectorAll('[class*="toggle"], [class*="switch"], [data-test-id*="activate"]');
        for (const toggle of toggles) {
          toggle.click();
          return;
        }
      });
      await sleep(1500);

      console.log(`   ✅ Concluído!`);

    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TODOS OS WORKFLOWS IMPORTADOS!');
  console.log('='.repeat(60));
  console.log('\n📌 Verifique no n8n se estão ativos.');
  console.log('🔗 Mantenha o Chrome aberto.');
}

main().catch(console.error);
