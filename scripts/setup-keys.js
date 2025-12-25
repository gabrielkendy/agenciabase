// Script para configurar as API keys automaticamente no localStorage
// Execute no console do navegador após abrir o app

const API_KEYS = {
  openRouter: 'SUA_CHAVE_OPENROUTER',
  openai: 'SUA_CHAVE_OPENAI',
  falAI: 'SUA_CHAVE_FALAI',
  elevenLabs: 'SUA_CHAVE_ELEVENLABS',
  freepik: 'SUA_CHAVE_FREEPIK',
  lateAPI: 'SUA_CHAVE_LATEAPI',
  gemini: 'SUA_CHAVE_GEMINI'
};

// Salvar no localStorage
localStorage.setItem('api_keys', JSON.stringify(API_KEYS));

console.log('✅ API Keys configuradas com sucesso!');
console.log('Recarregue a página para aplicar as configurações.');
