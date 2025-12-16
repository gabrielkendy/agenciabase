import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { ChatbotConfig, ChatbotField } from '../types';
import { validateEmail, validatePhone } from '../utils/validators';
import clsx from 'clsx';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

export const ChatbotPage = () => {
  const { botId } = useParams<{ botId: string }>();
  
  // For demo, we'll use a default config - in production this would come from API/store
  const [config] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    if (config) {
      setTimeout(() => {
        addBotMessage(config.greeting);
        setTimeout(() => {
          if (config.fields_to_collect.length > 0) {
            setCurrentFieldIndex(0);
            addBotMessage(config.fields_to_collect[0].question);
          }
        }, 1000);
      }, 500);
    }
  }, [config]);

  const addBotMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        text,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date(),
    }]);
  };

  const validateField = (field: ChatbotField, value: string): boolean => {
    if (field.required && !value.trim()) {
      setError(field.validation_message || 'Este campo é obrigatório');
      return false;
    }

    switch (field.type) {
      case 'email':
        if (!validateEmail(value)) {
          setError(field.validation_message || 'Por favor, insira um email válido');
          return false;
        }
        break;
      case 'phone':
        if (!validatePhone(value)) {
          setError(field.validation_message || 'Por favor, insira um telefone válido');
          return false;
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          setError(field.validation_message || 'Por favor, insira um número válido');
          return false;
        }
        break;
    }

    setError('');
    return true;
  };

  const handleSend = () => {
    if (!input.trim() || isComplete) return;

    const currentField = config.fields_to_collect[currentFieldIndex];
    
    if (!validateField(currentField, input)) {
      return;
    }

    addUserMessage(input);
    
    // Save collected data
    const newData = { ...collectedData, [currentField.name]: input };
    setCollectedData(newData);
    setInput('');

    // Move to next field or complete
    setTimeout(() => {
      if (currentFieldIndex < config.fields_to_collect.length - 1) {
        setCurrentFieldIndex(currentFieldIndex + 1);
        addBotMessage(config.fields_to_collect[currentFieldIndex + 1].question);
      } else {
        setIsComplete(true);
        addBotMessage(config.thank_you_message);
        
        // Send data to webhook if configured
        if (config.webhook_url) {
          sendToWebhook(newData);
        }
        
        // Could also create a lead in the system here
        console.log('Lead captured:', newData);
      }
    }, 300);
  };

  const sendToWebhook = async (data: Record<string, string>) => {
    if (!config.webhook_url) return;
    
    try {
      await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          bot_name: config.name,
          collected_at: new Date().toISOString(),
          data,
        }),
      });
    } catch (err) {
      console.error('Webhook error:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentField = config.fields_to_collect[currentFieldIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Chat Container */}
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                {config.avatar}
              </div>
              <div>
                <h1 className="font-bold text-white">{config.name}</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-400">Online agora</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={clsx(
                  'flex',
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.type === 'bot' && (
                  <span className="text-xl mr-2 mt-1">{config.avatar}</span>
                )}
                <div
                  className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-tr-sm text-white'
                      : 'bg-gray-800 rounded-tl-sm text-gray-100'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[10px] mt-1 opacity-50">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <span className="text-xl">{config.avatar}</span>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Icons.AlertCircle size={14} /> {error}
              </p>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-700/50 bg-gray-900/50">
            {isComplete ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-400">Conversa finalizada</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  Iniciar nova conversa
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {currentField?.type === 'select' && currentField.options ? (
                  <div className="flex-1 flex flex-wrap gap-2">
                    {currentField.options.map(option => (
                      <button
                        key={option}
                        onClick={() => {
                          setInput(option);
                          setTimeout(() => handleSend(), 100);
                        }}
                        className="px-3 py-2 bg-gray-800 hover:bg-purple-600/20 border border-gray-700 hover:border-purple-500 rounded-full text-sm text-white transition"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      ref={inputRef}
                      type={currentField?.type === 'email' ? 'email' : currentField?.type === 'phone' ? 'tel' : 'text'}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        currentField?.type === 'email' ? 'seu@email.com' :
                        currentField?.type === 'phone' ? '(00) 00000-0000' :
                        'Digite sua resposta...'
                      }
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
                    >
                      <Icons.Send size={18} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Powered by <span className="text-orange-400">BASE Agency</span>
        </p>
      </div>
    </div>
  );
};

// Default chatbot config for demo
const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  id: 'default',
  name: 'Assistente Virtual',
  avatar: '🤖',
  personality: 'Amigável e profissional',
  greeting: 'Olá! 👋 Bem-vindo! Sou o assistente virtual da BASE Agency. Vou te ajudar a conhecer nossos serviços. Vamos começar?',
  fields_to_collect: [
    { id: '1', name: 'nome', label: 'Nome', type: 'text', question: 'Para começar, qual é o seu nome?', required: true, order: 0 },
    { id: '2', name: 'email', label: 'Email', type: 'email', question: 'Ótimo, prazer em conhecê-lo! Qual seu melhor email para contato?', required: true, order: 1 },
    { id: '3', name: 'telefone', label: 'Telefone', type: 'phone', question: 'E qual seu telefone com DDD? 📱', required: true, order: 2 },
    { id: '4', name: 'interesse', label: 'Interesse', type: 'select', question: 'Perfeito! O que mais te interessa em nossos serviços?', options: ['Marketing Digital', 'Gestão de Redes Sociais', 'Criação de Conteúdo', 'Design Gráfico', 'Consultoria'], required: true, order: 3 },
  ],
  thank_you_message: 'Maravilha! 🚀 Recebi todas as informações. Nossa equipe entrará em contato em breve para apresentar as melhores soluções para você. Até logo!',
  is_active: true,
  created_at: new Date().toISOString(),
};
