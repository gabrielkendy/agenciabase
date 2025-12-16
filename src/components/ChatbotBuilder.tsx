import { useState } from 'react';
import { Icons } from './Icons';
import { ChatbotConfig, ChatbotField } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Props {
  config?: ChatbotConfig | null;
  onSave: (config: ChatbotConfig) => void;
  onClose: () => void;
}

const AVATARS = ['🤖', '👋', '💬', '🎯', '⭐', '🚀', '💡', '📱'];

const DEFAULT_FIELDS: ChatbotField[] = [
  { id: '1', name: 'name', label: 'Nome', type: 'text', question: 'Qual é o seu nome?', required: true, order: 1 },
  { id: '2', name: 'email', label: 'Email', type: 'email', question: 'Qual é o seu melhor e-mail?', required: true, order: 2 },
  { id: '3', name: 'phone', label: 'Telefone', type: 'phone', question: 'Qual é o seu WhatsApp?', required: true, order: 3 },
];

export const ChatbotBuilder = ({ config, onSave, onClose }: Props) => {
  const [formData, setFormData] = useState<ChatbotConfig>({
    id: config?.id || crypto.randomUUID(),
    name: config?.name || 'Assistente Virtual',
    avatar: config?.avatar || '🤖',
    personality: config?.personality || 'Sou um assistente amigável e prestativo da agência. Estou aqui para ajudar!',
    greeting: config?.greeting || 'Olá! 👋 Bem-vindo à nossa agência! Vou fazer algumas perguntas rápidas para entender melhor como podemos ajudar você.',
    fields_to_collect: config?.fields_to_collect || DEFAULT_FIELDS,
    thank_you_message: config?.thank_you_message || 'Obrigado pelas informações! 🎉 Nossa equipe entrará em contato em breve. Fique à vontade para explorar nossos trabalhos!',
    webhook_url: config?.webhook_url || '',
    is_active: config?.is_active ?? true,
    created_at: config?.created_at || new Date().toISOString()
  });

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const addField = () => {
    const newField: ChatbotField = {
      id: crypto.randomUUID(),
      name: `field_${formData.fields_to_collect.length + 1}`,
      label: 'Novo Campo',
      type: 'text',
      question: 'Qual é a sua resposta?',
      required: false,
      order: formData.fields_to_collect.length + 1
    };
    setFormData({ ...formData, fields_to_collect: [...formData.fields_to_collect, newField] });
    setActiveFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<ChatbotField>) => {
    setFormData({
      ...formData,
      fields_to_collect: formData.fields_to_collect.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id: string) => {
    setFormData({
      ...formData,
      fields_to_collect: formData.fields_to_collect.filter(f => f.id !== id)
    });
    setActiveFieldId(null);
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = formData.fields_to_collect.findIndex(f => f.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === formData.fields_to_collect.length - 1)) return;
    
    const newFields = [...formData.fields_to_collect];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    newFields.forEach((f, i) => f.order = i + 1);
    setFormData({ ...formData, fields_to_collect: newFields });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do chatbot obrigatório');
      return;
    }
    if (formData.fields_to_collect.length === 0) {
      toast.error('Adicione pelo menos um campo');
      return;
    }
    onSave(formData);
    toast.success('Chatbot salvo!');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Bot size={20} className="text-green-400" />
            {config ? 'Editar Chatbot' : 'Novo Chatbot de Captura'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition',
                showPreview ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              <Icons.Eye size={16} /> Preview
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Editor */}
          <div className={clsx('flex-1 p-4 overflow-y-auto', showPreview && 'hidden lg:block lg:w-1/2')}>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="text-white font-medium">Configuração Básica</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome do Chatbot</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Avatar</label>
                    <div className="flex gap-2">
                      {AVATARS.map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar: a })}
                          className={clsx(
                            'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition',
                            formData.avatar === a ? 'bg-green-500' : 'bg-gray-800 hover:bg-gray-700'
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Personalidade</label>
                  <textarea
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none resize-none"
                    placeholder="Descreva a personalidade do bot..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mensagem de Boas-vindas</label>
                  <textarea
                    value={formData.greeting}
                    onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Campos a Coletar</h3>
                  <button onClick={addField} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm flex items-center gap-1">
                    <Icons.Plus size={16} /> Campo
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.fields_to_collect.sort((a, b) => a.order - b.order).map((field, index) => (
                    <div
                      key={field.id}
                      className={clsx(
                        'p-3 rounded-xl border transition cursor-pointer',
                        activeFieldId === field.id ? 'bg-gray-800 border-green-500' : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      )}
                      onClick={() => setActiveFieldId(activeFieldId === field.id ? null : field.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-sm">{index + 1}.</span>
                          <span className="text-white font-medium">{field.label}</span>
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{field.type}</span>
                          {field.required && <span className="text-xs text-red-400">*</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up'); }} className="p-1 text-gray-500 hover:text-white">
                            <Icons.ChevronUp size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down'); }} className="p-1 text-gray-500 hover:text-white">
                            <Icons.ChevronDown size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-red-400 hover:text-red-300">
                            <Icons.Delete size={16} />
                          </button>
                        </div>
                      </div>

                      {activeFieldId === field.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700 space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="Label"
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                            />
                            <select
                              value={field.type}
                              onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                            >
                              <option value="text">Texto</option>
                              <option value="email">Email</option>
                              <option value="phone">Telefone</option>
                              <option value="number">Número</option>
                              <option value="select">Seleção</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={field.question}
                            onChange={(e) => updateField(field.id, { question: e.target.value })}
                            placeholder="Pergunta que o bot vai fazer"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                          />
                          <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="rounded"
                            />
                            Campo obrigatório
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Thank You */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <label className="block text-sm text-gray-400 mb-1">Mensagem de Agradecimento</label>
                <textarea
                  value={formData.thank_you_message}
                  onChange={(e) => setFormData({ ...formData, thank_you_message: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none resize-none"
                />
              </div>

              {/* Webhook */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <label className="block text-sm text-gray-400 mb-1">Webhook URL (opcional)</label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://seu-webhook.com/leads"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Os dados coletados serão enviados para esta URL via POST</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="flex-1 lg:w-1/2 bg-gradient-to-br from-gray-800 to-gray-900 p-4 flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-green-500 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{formData.avatar}</span>
                    <div>
                      <p className="font-bold">{formData.name}</p>
                      <p className="text-xs text-green-100">Online</p>
                    </div>
                  </div>
                </div>
                <div className="h-80 p-4 overflow-y-auto space-y-3 bg-gray-50">
                  <div className="flex gap-2">
                    <span className="text-xl">{formData.avatar}</span>
                    <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[80%]">
                      <p className="text-sm text-gray-700">{formData.greeting}</p>
                    </div>
                  </div>
                  {formData.fields_to_collect.slice(0, 2).map((field) => (
                    <div key={field.id} className="flex gap-2">
                      <span className="text-xl">{formData.avatar}</span>
                      <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[80%]">
                        <p className="text-sm text-gray-700">{field.question}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none"
                      disabled
                    />
                    <button className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Icons.Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Status:</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium transition',
                formData.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
              )}
            >
              {formData.is_active ? 'Ativo' : 'Inativo'}
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition">
              Salvar Chatbot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
