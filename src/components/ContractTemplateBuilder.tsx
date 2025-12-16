import { useState } from 'react';
import { Icons } from './Icons';
import { ContractTemplate, CONTRACT_VARIABLES } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Props {
  template?: ContractTemplate | null;
  onSave: (template: ContractTemplate) => void;
  onClose: () => void;
}

export const ContractTemplateBuilder = ({ template, onSave, onClose }: Props) => {
  const [formData, setFormData] = useState<ContractTemplate>({
    id: template?.id || crypto.randomUUID(),
    name: template?.name || '',
    description: template?.description || '',
    content: template?.content || DEFAULT_CONTRACT_TEMPLATE,
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
    created_at: template?.created_at || new Date().toISOString()
  });

  const [showPreview, setShowPreview] = useState(false);

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('contract-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = formData.content.substring(0, start) + `{{${variable}}}` + formData.content.substring(end);
      setFormData({ ...formData, content: newContent });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    } else {
      setFormData({ ...formData, content: formData.content + `{{${variable}}}` });
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do contrato obrigatório');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Conteúdo do contrato obrigatório');
      return;
    }
    onSave(formData);
    toast.success('Contrato salvo!');
  };

  const previewContent = () => {
    return formData.content
      .replace(/\{\{cliente_nome\}\}/g, 'João da Silva')
      .replace(/\{\{cliente_empresa\}\}/g, 'Empresa XYZ Ltda')
      .replace(/\{\{cliente_cpf_cnpj\}\}/g, '12.345.678/0001-90')
      .replace(/\{\{cliente_email\}\}/g, 'joao@empresa.com')
      .replace(/\{\{cliente_telefone\}\}/g, '(11) 99999-9999')
      .replace(/\{\{cliente_endereco\}\}/g, 'Rua das Flores, 123 - São Paulo/SP')
      .replace(/\{\{valor_mensal\}\}/g, 'R$ 2.500,00')
      .replace(/\{\{data_inicio\}\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{data_fim\}\}/g, new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString('pt-BR'))
      .replace(/\{\{servicos\}\}/g, 'Gestão de Redes Sociais, Criação de Conteúdo, Design Gráfico')
      .replace(/\{\{posts_mes\}\}/g, '20')
      .replace(/\{\{redes_sociais\}\}/g, 'Instagram, Facebook, LinkedIn')
      .replace(/\{\{agencia_nome\}\}/g, 'Agência Base')
      .replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString('pt-BR'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.FileText size={20} className="text-blue-400" />
            {template ? 'Editar Contrato' : 'Novo Modelo de Contrato'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition',
                showPreview ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              <Icons.Eye size={16} /> {showPreview ? 'Editar' : 'Preview'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Editor */}
          <div className={clsx('flex-1 p-4 overflow-y-auto', showPreview && 'hidden lg:block')}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome do Modelo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Contrato de Prestação de Serviços"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição breve do modelo"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Variáveis (clique para inserir)</label>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 bg-gray-800 hover:bg-blue-500/20 border border-gray-700 hover:border-blue-500 rounded text-xs text-gray-300 hover:text-blue-400 transition"
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Conteúdo do Contrato</label>
                <textarea
                  id="contract-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="flex-1 p-4 overflow-y-auto bg-white">
              <div className="max-w-2xl mx-auto py-8 px-4 text-gray-900 prose prose-sm">
                <div dangerouslySetInnerHTML={{ __html: previewContent().replace(/\n/g, '<br/>') }} />
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
            <button onClick={handleSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
              Salvar Contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL

CONTRATANTE: {{cliente_nome}}
CNPJ/CPF: {{cliente_cpf_cnpj}}
E-mail: {{cliente_email}}
Telefone: {{cliente_telefone}}
Endereço: {{cliente_endereco}}

CONTRATADA: {{agencia_nome}}

DATA DE INÍCIO: {{data_inicio}}
DATA DE TÉRMINO: {{data_fim}}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços de marketing digital:
{{servicos}}

CLÁUSULA 2ª - DAS ENTREGAS
A CONTRATADA se compromete a entregar mensalmente:
- {{posts_mes}} publicações para as redes sociais
- Redes atendidas: {{redes_sociais}}

CLÁUSULA 3ª - DO VALOR E PAGAMENTO
Valor mensal: {{valor_mensal}}
Vencimento: Todo dia 10 de cada mês

CLÁUSULA 4ª - DAS OBRIGAÇÕES DA CONTRATANTE
- Fornecer informações e materiais necessários para a criação do conteúdo
- Aprovar ou solicitar ajustes no prazo de 48 horas úteis
- Efetuar os pagamentos nas datas acordadas

CLÁUSULA 5ª - DAS OBRIGAÇÕES DA CONTRATADA
- Criar e publicar o conteúdo conforme briefing aprovado
- Manter a qualidade e consistência visual
- Apresentar relatórios mensais de desempenho

CLÁUSULA 6ª - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.

E, por estarem assim justos e contratados, assinam o presente instrumento em duas vias de igual teor.

{{cliente_endereco}}, {{data_atual}}

_______________________________
{{cliente_nome}}
CONTRATANTE

_______________________________
{{agencia_nome}}
CONTRATADA`;
