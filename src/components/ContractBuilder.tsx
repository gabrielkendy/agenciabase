import { useState } from 'react';
import { Icons } from './Icons';
import { ContractTemplate, CONTRACT_VARIABLES } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  templates: ContractTemplate[];
  onSave: (templates: ContractTemplate[]) => void;
  onClose: () => void;
}

const DEFAULT_CONTRACT = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS

**CONTRATANTE:** {{cliente_nome}}
**EMPRESA:** {{cliente_empresa}}
**CPF/CNPJ:** {{cliente_cpf_cnpj}}
**EMAIL:** {{cliente_email}}
**TELEFONE:** {{cliente_telefone}}

**CONTRATADA:** {{agencia_nome}}

---

## CLÁUSULA 1 - DO OBJETO

O presente contrato tem como objeto a prestação de serviços de marketing digital, incluindo:
{{servicos}}

## CLÁUSULA 2 - DO VALOR E PAGAMENTO

**Valor Mensal:** {{valor_mensal}}
**Forma de Pagamento:** PIX ou Boleto
**Vencimento:** Todo dia {{dia_vencimento}} de cada mês

## CLÁUSULA 3 - DA VIGÊNCIA

Este contrato terá vigência de **{{vigencia_meses}} meses**, iniciando em {{data_inicio}} e terminando em {{data_fim}}.

## CLÁUSULA 4 - DAS ENTREGAS

A CONTRATADA se compromete a entregar mensalmente:
- {{posts_mes}} posts para redes sociais
- Redes atendidas: {{redes_sociais}}

## CLÁUSULA 5 - DA RESCISÃO

O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.

---

**Local e Data:** _______________, {{data_assinatura}}

**CONTRATANTE:**
_______________________________
{{cliente_nome}}

**CONTRATADA:**
_______________________________
{{agencia_nome}}
`;

export const ContractBuilder = ({ templates, onSave, onClose }: Props) => {
  const [localTemplates, setLocalTemplates] = useState<ContractTemplate[]>(templates);
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const createNewTemplate = () => {
    const newTemplate: ContractTemplate = {
      id: uuidv4(),
      name: 'Novo Contrato',
      description: 'Modelo de contrato padrão',
      content: DEFAULT_CONTRACT,
      variables: CONTRACT_VARIABLES,
      is_active: true,
      created_at: new Date().toISOString()
    };
    setEditingTemplate(newTemplate);
    setIsEditing(true);
  };

  const editTemplate = (template: ContractTemplate) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      toast.error('Nome obrigatório');
      return;
    }

    const exists = localTemplates.find(t => t.id === editingTemplate.id);
    if (exists) {
      setLocalTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    } else {
      setLocalTemplates(prev => [...prev, editingTemplate]);
    }
    
    setSelectedId(editingTemplate.id);
    setIsEditing(false);
    setEditingTemplate(null);
    toast.success('Template salvo!');
  };

  const deleteTemplate = (id: string) => {
    if (!confirm('Excluir este template?')) return;
    setLocalTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(localTemplates[0]?.id || null);
    toast.success('Template excluído!');
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    const textarea = document.getElementById('contract-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editingTemplate.content;
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
      setEditingTemplate({ ...editingTemplate, content: newText });
    }
  };

  const handleSaveAll = () => {
    onSave(localTemplates);
    toast.success('Contratos salvos!');
    onClose();
  };

  const previewContent = (content: string) => {
    let preview = content;
    const sampleData: Record<string, string> = {
      cliente_nome: 'João da Silva',
      cliente_empresa: 'Empresa ABC Ltda',
      cliente_cpf_cnpj: '12.345.678/0001-90',
      cliente_email: 'joao@empresa.com',
      cliente_telefone: '(11) 99999-9999',
      cliente_endereco: 'Rua das Flores, 123 - São Paulo/SP',
      agencia_nome: 'BASE Agency',
      valor_mensal: 'R$ 2.500,00',
      dia_vencimento: '10',
      data_inicio: '01/01/2025',
      data_fim: '31/12/2025',
      data_assinatura: new Date().toLocaleDateString('pt-BR'),
      vigencia_meses: '12',
      servicos: 'Gestão de redes sociais, criação de conteúdo, design gráfico',
      posts_mes: '20',
      redes_sociais: 'Instagram, Facebook, LinkedIn'
    };
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icons.FileText className="text-blue-400" size={24} />
              Builder de Contratos
            </h2>
            <p className="text-sm text-gray-500">Crie e gerencie templates de contrato</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
            <Icons.X size={24} />
          </button>
        </div>

        {isEditing && editingTemplate ? (
          /* Editor Mode */
          <div className="flex-1 flex overflow-hidden">
            {/* Variables Panel */}
            <div className="w-64 border-r border-gray-800 overflow-y-auto p-4">
              <p className="text-xs text-gray-500 uppercase font-medium mb-3">Variáveis Disponíveis</p>
              <div className="space-y-2">
                {CONTRACT_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="w-full text-left p-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition"
                  >
                    <span className="text-xs text-blue-400 font-mono">{`{{${v.key}}}`}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{v.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-800 space-y-3">
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Nome do template"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Descrição (opcional)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex-1 p-4 overflow-hidden flex gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="text-sm text-gray-400 mb-2">Conteúdo (Markdown)</label>
                  <textarea
                    id="contract-textarea"
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none resize-none font-mono"
                  />
                </div>

                {showPreview && (
                  <div className="flex-1 flex flex-col">
                    <label className="text-sm text-gray-400 mb-2">Preview</label>
                    <div className="flex-1 bg-white rounded-xl p-6 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none text-gray-800"
                        dangerouslySetInnerHTML={{ 
                          __html: previewContent(editingTemplate.content)
                            .replace(/\n/g, '<br>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/# (.*?)(<br>|$)/g, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
                            .replace(/## (.*?)(<br>|$)/g, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-800 flex justify-between">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition flex items-center gap-2"
                >
                  <Icons.Eye size={18} /> {showPreview ? 'Ocultar' : 'Ver'} Preview
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setEditingTemplate(null); }} className="px-4 py-2 text-gray-400 hover:text-white transition">
                    Cancelar
                  </button>
                  <button onClick={saveTemplate} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2">
                    <Icons.Save size={18} /> Salvar Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400">{localTemplates.length} template(s)</p>
              <button
                onClick={createNewTemplate}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <Icons.Plus size={18} /> Novo Template
              </button>
            </div>

            {localTemplates.length === 0 ? (
              <div className="text-center py-16">
                <Icons.FileText size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500">Nenhum template criado</p>
                <button onClick={createNewTemplate} className="mt-4 text-blue-400 hover:text-blue-300">
                  + Criar primeiro template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localTemplates.map(template => (
                  <div
                    key={template.id}
                    className={clsx(
                      'bg-gray-800/50 border rounded-xl p-4 cursor-pointer transition hover:border-blue-500/50',
                      selectedId === template.id ? 'border-blue-500' : 'border-gray-700'
                    )}
                    onClick={() => setSelectedId(template.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icons.FileText className="text-blue-400" size={20} />
                        <h3 className="font-medium text-white">{template.name}</h3>
                      </div>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      )}>
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); editTemplate(template); }}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-1"
                      >
                        <Icons.Edit size={14} /> Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                        className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      >
                        <Icons.Delete size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isEditing && (
          <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition">
              Cancelar
            </button>
            <button onClick={handleSaveAll} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition flex items-center gap-2">
              <Icons.Save size={18} /> Salvar Alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
