const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://agenciabase.app.n8n.cloud';
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
  console.log('🚀 BASE Agency - Configurando n8n via Puppeteer');
  console.log('='.repeat(60));

  console.log('\n🔗 Abrindo Chrome...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const page = await browser.newPage();
  
  console.log('📍 Acessando n8n...');
  await page.goto(N8N_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(5000);

  // Verificar se está logado
  const url = page.url();
  console.log('URL atual:', url);

  if (url.includes('signin')) {
    console.log('⚠️ Precisa fazer login! Aguardando você logar...');
    await page.waitForNavigation({ timeout: 120000 });
  }

  await sleep(3000);

  // Importar workflows
  for (let i = 0; i < WORKFLOWS.length; i++) {
    const workflowFile = WORKFLOWS[i];
    const filePath = path.join(WORKFLOWS_DIR, workflowFile);
    
    console.log(`\n📦 [${i+1}/${WORKFLOWS.length}] Importando: ${workflowFile}`);
    
    try {
      // Ir para home
      await page.goto(N8N_URL, { waitUntil: 'networkidle2' });
      await sleep(2000);

      // Clicar em Add workflow
      console.log('   🔍 Procurando botão Add Workflow...');
      
      // Tentar diferentes seletores
      let clicked = false;
      
      // Tentar por data-test-id
      try {
        await page.waitForSelector('[data-test-id="add-workflow-button"]', { timeout: 5000 });
        await page.click('[data-test-id="add-workflow-button"]');
        clicked = true;
      } catch (e) {}

      if (!clicked) {
        // Tentar por texto
        try {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const addBtn = btns.find(b => b.textContent.toLowerCase().includes('add workflow') || b.textContent.toLowerCase().includes('novo'));
            if (addBtn) { addBtn.click(); return true; }
            return false;
          });
          clicked = true;
        } catch (e) {}
      }

      if (!clicked) {
        // Tentar pelo ícone +
        try {
          await page.click('[class*="add"]');
          clicked = true;
        } catch (e) {}
      }

      await sleep(2000);
      
      // Abrir menu do workflow (3 pontinhos ou menu)
      console.log('   🔍 Abrindo menu de importação...');
      
      // Tentar Ctrl+I ou Ctrl+O
      await page.keyboard.down('Control');
      await page.keyboard.press('i');
      await page.keyboard.up('Control');
      await sleep(1000);

      // Verificar se abriu modal de import
      let hasImportModal = await page.evaluate(() => {
        return document.body.innerText.includes('Import') || document.body.innerText.includes('import');
      });

      if (!hasImportModal) {
        // Tentar pelo menu
        try {
          // Clicar no menu de opções
          await page.click('[data-test-id="workflow-more-options-button"]');
          await sleep(500);
          
          // Clicar em Import
          await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], button'));
            const importItem = items.find(i => i.textContent.toLowerCase().includes('import'));
            if (importItem) importItem.click();
          });
          await sleep(1000);
        } catch (e) {}
      }

      // Upload do arquivo
      console.log('   📤 Fazendo upload...');
      
      // Preparar o file chooser
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 10000 }).catch(() => null),
        page.evaluate(() => {
          // Tentar clicar em qualquer input de arquivo ou área de drop
          const input = document.querySelector('input[type="file"]');
          if (input) input.click();
        })
      ]);

      if (fileChooser) {
        await fileChooser.accept([filePath]);
        console.log('   ✅ Arquivo carregado!');
        await sleep(3000);
      } else {
        // Tentar outra abordagem - setar diretamente
        const inputHandle = await page.$('input[type="file"]');
        if (inputHandle) {
          await inputHandle.uploadFile(filePath);
          console.log('   ✅ Arquivo carregado via input!');
          await sleep(3000);
        } else {
          console.log('   ⚠️ Não encontrou input de arquivo');
        }
      }

      // Salvar workflow
      console.log('   💾 Salvando...');
      await page.keyboard.down('Control');
      await page.keyboard.press('s');
      await page.keyboard.up('Control');
      await sleep(2000);

      // Ativar workflow
      console.log('   🔌 Ativando...');
      try {
        const toggle = await page.$('[data-test-id="workflow-activate-button"], [class*="toggle"], [class*="switch"]');
        if (toggle) {
          await toggle.click();
          console.log('   🟢 Ativado!');
        }
      } catch (e) {}

      await sleep(2000);
      console.log(`   ✅ ${workflowFile} importado!`);

    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
  console.log('='.repeat(60));
  console.log('\n⏳ Aguardando 30 segundos para você verificar...');
  console.log('   Depois o navegador vai fechar.');
  
  await sleep(30000);
  await browser.close();
}

main().catch(console.error);
