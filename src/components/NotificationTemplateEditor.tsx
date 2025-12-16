import { useState } from 'react';
import { Icons } from './Icons';
import { NOTIFICATION_TRIGGERS, MESSAGE_VARIABLES, NotificationTemplate } from '../services/zapiService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Props {
  template?: NotificationTemplate | null;
  onSave: (template: NotificationTemplate) => void;
  onClose: () => void;
}

export const NotificationTemplateEditor = ({ template, onSave, onClose }: Props) => {
  const [formData, setFormData] = useState<NotificationTemplate>({
    id: template?.id || crypto.randomUUID(),
    name: template?.name || '',
    trigger: template?.trigger || 'demand_created',
    channel: template?.channel || 'whatsapp',
    message: template?.message || '',
    isActive: template?.isActive ?? true,
    variables: template?.variables || []
  });

  const selectedTrigger = NOTIFICATION_TRIGGERS.find(t => t.id === formData.trigger);

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = formData.message.substring(0, start) + `{{${variable}}}` + formData.message.substring(end);
      setFormData({ ...formData, message: newMessage });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    } else {
      setFormData({ ...formData, message: formData.message + `{{${variable}}}` });
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do template obrigatório');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Mensagem obrigatória');
      return;
    }
    onSave(formData);
    toast.success('Template salvo!');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Bell size={20} className="text-purple-400" />
            {template ? 'Editar Template' : 'Novo Template de Notificação'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Nome */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do Template</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Notificação de Nova Demanda"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gatilho (Quando Disparar)</label>
            <select
              value={formData.trigger}
              onChange={(e) => setFormData({ ...formData, trigger: e.target.value as any })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
            >
              {NOTIFICATION_TRIGGERS.map(trigger => (
                <option key={trigger.id} value={trigger.id}>{trigger.label}</option>
              ))}
            </select>
            {selectedTrigger && (
              <p className="text-xs text-gray-500 mt-1">{selectedTrigger.description}</p>
            )}
          </div>

          {/* Canal */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Canal</label>
            <div className="flex gap-2">
              {['whatsapp', 'email'].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setFormData({ ...formData, channel: ch as any })}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition',
                    formData.channel === ch
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  {ch === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mensagem</label>
            <textarea
              id="message-textarea"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Digite a mensagem. Use as variáveis abaixo para personalizar..."
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
            />
          </div>

          {/* Variáveis */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Variáveis Disponíveis (clique para inserir)</label>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-purple-500/20 border border-gray-700 hover:border-purple-500 rounded-lg text-xs text-gray-300 hover:text-purple-400 transition"
                  title={v.description}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Preview da Mensagem</label>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                  {formData.channel === 'whatsapp' ? '📱' : '📧'}
                </div>
                <div className="flex-1 bg-gray-700/50 rounded-xl p-3">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {formData.message
                      .replace(/\{\{cliente_nome\}\}/g, 'João Silva')
                      .replace(/\{\{cliente_empresa\}\}/g, 'Empresa XYZ')
                      .replace(/\{\{demanda_titulo\}\}/g, 'Post Instagram Março')
                      .replace(/\{\{demanda_tipo\}\}/g, 'Feed')
                      .replace(/\{\{link_aprovacao\}\}/g, 'https://agencia.com/aprovar/abc123')
                      .replace(/\{\{agencia_nome\}\}/g, 'Agência Base')
                      || 'Digite uma mensagem acima...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
            <div>
              <p className="text-white font-medium">Template Ativo</p>
              <p className="text-xs text-gray-500">Desative para pausar notificações deste gatilho</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={clsx(
                'w-12 h-6 rounded-full transition-colors relative',
                formData.isActive ? 'bg-purple-500' : 'bg-gray-700'
              )}
            >
              <div className={clsx(
                'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all',
                formData.isActive ? 'left-6' : 'left-0.5'
              )} />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition">
            Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
};
