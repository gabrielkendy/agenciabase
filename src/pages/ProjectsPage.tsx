import { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { projectKnowledgeService } from '../services/projectKnowledgeService';
import type { ChatProject, ProjectKnowledge } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// Project colors
const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#84cc16'
];

const PROJECT_ICONS = ['📁', '💼', '🎯', '🚀', '💡', '📊', '🎨', '✨', '📝', '🔥', '⚡', '🌟', '💎', '🎬', '📱'];

type DetailTab = 'instructions' | 'memory' | 'files';

export const ProjectsPage = () => {
  const { conversations } = useStore();

  // State
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ChatProject | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('instructions');
  const [isLoading, setIsLoading] = useState(true);

  // Project form state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ChatProject | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);
  const [projectIcon, setProjectIcon] = useState(PROJECT_ICONS[0]);
  const [projectInstructions, setProjectInstructions] = useState('');

  // Knowledge state
  const [knowledge, setKnowledge] = useState<ProjectKnowledge[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState({ totalItems: 0, readyItems: 0, totalChars: 0 });
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [newKnowledgeType, setNewKnowledgeType] = useState<'url' | 'text' | 'file'>('url');
  const [newKnowledgeUrl, setNewKnowledgeUrl] = useState('');
  const [newKnowledgeText, setNewKnowledgeText] = useState('');
  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState('');
  const [processingKnowledge, setProcessingKnowledge] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Load knowledge when project selected
  useEffect(() => {
    if (selectedProject) {
      loadProjectKnowledge(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectKnowledgeService.getProjects('1');
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectKnowledge = async (projectId: string) => {
    try {
      const data = await projectKnowledgeService.getProjectKnowledge(projectId);
      setKnowledge(data);

      const stats = await projectKnowledgeService.getProjectStats(projectId);
      setKnowledgeStats(stats);
    } catch (error) {
      console.error('Error loading knowledge:', error);
    }
  };

  const resetForm = () => {
    setProjectName('');
    setProjectDescription('');
    setProjectColor(PROJECT_COLORS[0]);
    setProjectIcon(PROJECT_ICONS[0]);
    setProjectInstructions('');
    setEditingProject(null);
  };

  const openEditProject = (project: ChatProject) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setProjectColor(project.color);
    setProjectIcon(project.icon);
    setProjectInstructions(project.instructions || '');
    setShowNewProjectModal(true);
  };

  const saveProject = async () => {
    if (!projectName.trim()) {
      toast.error('Digite um nome para o projeto');
      return;
    }

    try {
      const projectData: ChatProject = {
        id: editingProject?.id || crypto.randomUUID(),
        user_id: '1',
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        color: projectColor,
        icon: projectIcon,
        instructions: projectInstructions.trim() || undefined,
        created_at: editingProject?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saved = await projectKnowledgeService.saveProject(projectData);

      if (editingProject) {
        setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
        if (selectedProject?.id === saved.id) {
          setSelectedProject(saved);
        }
        toast.success('Projeto atualizado!');
      } else {
        setProjects(prev => [saved, ...prev]);
        toast.success('Projeto criado!');
      }

      setShowNewProjectModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const deleteProject = async (project: ChatProject) => {
    if (!confirm(`Excluir projeto "${project.name}"? Isso excluirá toda a memória e conhecimento associado.`)) {
      return;
    }

    try {
      await projectKnowledgeService.deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));

      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
      }

      toast.success('Projeto excluído!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const selectProject = (project: ChatProject) => {
    setSelectedProject(project);
    setDetailTab('instructions');
  };

  const saveInstructions = async () => {
    if (!selectedProject) return;

    try {
      const updated = { ...selectedProject, instructions: projectInstructions.trim() || undefined };
      await projectKnowledgeService.saveProject(updated);
      setSelectedProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success('Instruções salvas!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  // Add knowledge handlers
  const handleAddUrl = async () => {
    if (!newKnowledgeUrl.trim() || !selectedProject) return;

    setProcessingKnowledge(true);
    try {
      const { title, content } = await projectKnowledgeService.extractURLContent(newKnowledgeUrl.trim());

      await projectKnowledgeService.addKnowledge({
        project_id: selectedProject.id,
        type: 'url',
        title: newKnowledgeTitle.trim() || title,
        content,
        source_url: newKnowledgeUrl.trim(),
        status: 'ready',
      });

      await loadProjectKnowledge(selectedProject.id);
      setNewKnowledgeUrl('');
      setNewKnowledgeTitle('');
      setIsAddingKnowledge(false);
      toast.success('URL adicionada à memória!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setProcessingKnowledge(false);
    }
  };

  const handleAddText = async () => {
    if (!newKnowledgeText.trim() || !newKnowledgeTitle.trim() || !selectedProject) return;

    setProcessingKnowledge(true);
    try {
      await projectKnowledgeService.addKnowledge({
        project_id: selectedProject.id,
        type: 'text',
        title: newKnowledgeTitle.trim(),
        content: newKnowledgeText.trim(),
        status: 'ready',
      });

      await loadProjectKnowledge(selectedProject.id);
      setNewKnowledgeText('');
      setNewKnowledgeTitle('');
      setIsAddingKnowledge(false);
      toast.success('Texto adicionado à memória!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setProcessingKnowledge(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setProcessingKnowledge(true);
    try {
      let content = '';
      let title = file.name;
      let type: ProjectKnowledge['type'] = 'file';

      if (file.type === 'application/pdf') {
        type = 'pdf';
        content = await projectKnowledgeService.extractPDFText(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        content = await file.text();
      } else {
        // For other files, store as base64
        content = await projectKnowledgeService.fileToBase64(file);
      }

      await projectKnowledgeService.addKnowledge({
        project_id: selectedProject.id,
        type,
        title: newKnowledgeTitle.trim() || title,
        content,
        file_name: file.name,
        status: 'ready',
      });

      await loadProjectKnowledge(selectedProject.id);
      setNewKnowledgeTitle('');
      setIsAddingKnowledge(false);
      toast.success('Arquivo adicionado à memória!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setProcessingKnowledge(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteKnowledgeItem = async (item: ProjectKnowledge) => {
    if (!selectedProject) return;

    try {
      await projectKnowledgeService.deleteKnowledge(selectedProject.id, item.id);
      await loadProjectKnowledge(selectedProject.id);
      toast.success('Item removido!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  // Get conversations for current project
  const projectConversations = selectedProject
    ? conversations.filter(c => c.project_id === selectedProject.id)
    : [];

  const formatCharCount = (chars: number) => {
    if (chars < 1000) return chars + ' caracteres';
    if (chars < 1000000) return (chars / 1000).toFixed(1) + 'K caracteres';
    return (chars / 1000000).toFixed(1) + 'M caracteres';
  };

  return (
    <div className="h-full bg-gray-950 flex">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Sidebar - Projects List */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Folder className="text-orange-400" size={20} />
            Projetos
          </h1>
          <button
            onClick={() => { resetForm(); setShowNewProjectModal(true); }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Novo projeto"
          >
            <Icons.Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.Loader className="animate-spin text-gray-500" size={24} />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <Icons.Folder className="mx-auto text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 text-sm">Nenhum projeto ainda</p>
              <button
                onClick={() => { resetForm(); setShowNewProjectModal(true); }}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-sm font-medium"
              >
                Criar Projeto
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => selectProject(project)}
                className={clsx(
                  'w-full p-3 rounded-xl flex items-center gap-3 transition text-left group',
                  selectedProject?.id === project.id
                    ? 'bg-orange-500/20 border border-orange-500/50'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                )}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: project.color + '30' }}
                >
                  {project.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{project.name}</p>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate">{project.description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditProject(project); }}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Icons.Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(project); }}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedProject ? (
          // No project selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold text-white mb-2">Projetos</h2>
              <p className="text-gray-400 mb-6">
                Organize suas conversas em projetos. Cada projeto pode ter suas próprias instruções,
                memória e arquivos - igual ao Claude!
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">📝 Instruções</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">🧠 Memória</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">📎 Arquivos</span>
              </div>
              <button
                onClick={() => { resetForm(); setShowNewProjectModal(true); }}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium flex items-center gap-2 mx-auto"
              >
                <Icons.Plus size={20} />
                Criar Projeto
              </button>
            </div>
          </div>
        ) : (
          // Project detail view
          <>
            {/* Project Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                >
                  <Icons.ArrowLeft size={20} />
                </button>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedProject.color + '30' }}
                >
                  {selectedProject.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                  {selectedProject.description && (
                    <p className="text-sm text-gray-400">{selectedProject.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Icons.MessageSquare size={16} />
                  {projectConversations.length} conversas
                </div>
                <button
                  onClick={() => openEditProject(selectedProject)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                >
                  <Icons.Settings size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {[
                  { id: 'instructions', label: 'Instruções', icon: Icons.FileText },
                  { id: 'memory', label: 'Memória', icon: Icons.Brain },
                  { id: 'files', label: 'Arquivos', icon: Icons.Paperclip },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as DetailTab)}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition',
                      detailTab === tab.id
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Instructions Tab */}
              {detailTab === 'instructions' && (
                <div className="max-w-3xl">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <Icons.FileText size={20} className="text-blue-400" />
                      Instruções do Projeto
                    </h3>
                    <p className="text-sm text-gray-400">
                      Defina instruções personalizadas para este projeto. A IA seguirá estas diretrizes
                      em todas as conversas do projeto.
                    </p>
                  </div>

                  <textarea
                    value={projectInstructions}
                    onChange={(e) => setProjectInstructions(e.target.value)}
                    placeholder="Ex: Você é um assistente especializado em marketing digital. Use linguagem informal e responda sempre em português brasileiro..."
                    rows={12}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  />

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-500">
                      {projectInstructions.length} caracteres
                    </p>
                    <button
                      onClick={saveInstructions}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium flex items-center gap-2 transition"
                    >
                      <Icons.Save size={16} />
                      Salvar Instruções
                    </button>
                  </div>
                </div>
              )}

              {/* Memory Tab */}
              {detailTab === 'memory' && (
                <div className="max-w-4xl">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Icons.Brain size={20} className="text-purple-400" />
                        Memória do Projeto
                      </h3>
                      <button
                        onClick={() => setIsAddingKnowledge(true)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition"
                      >
                        <Icons.Plus size={16} />
                        Adicionar Conhecimento
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      Adicione URLs, textos e documentos para a IA usar como contexto nas conversas.
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-2xl font-bold text-white">{knowledgeStats.totalItems}</p>
                      <p className="text-sm text-gray-400">Itens totais</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-2xl font-bold text-green-400">{knowledgeStats.readyItems}</p>
                      <p className="text-sm text-gray-400">Prontos para uso</p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <p className="text-2xl font-bold text-purple-400">{formatCharCount(knowledgeStats.totalChars)}</p>
                      <p className="text-sm text-gray-400">de contexto</p>
                    </div>
                  </div>

                  {/* Add Knowledge Form */}
                  {isAddingKnowledge && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-white">Adicionar Conhecimento</h4>
                        <button
                          onClick={() => setIsAddingKnowledge(false)}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <Icons.X size={18} />
                        </button>
                      </div>

                      {/* Type selector */}
                      <div className="flex gap-2 mb-4">
                        {[
                          { id: 'url', label: 'URL', icon: Icons.Link },
                          { id: 'text', label: 'Texto', icon: Icons.FileText },
                          { id: 'file', label: 'Arquivo', icon: Icons.Upload },
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setNewKnowledgeType(type.id as 'url' | 'text' | 'file')}
                            className={clsx(
                              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition',
                              newKnowledgeType === type.id
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
                                : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                            )}
                          >
                            <type.icon size={16} />
                            {type.label}
                          </button>
                        ))}
                      </div>

                      {/* Title input */}
                      <input
                        type="text"
                        value={newKnowledgeTitle}
                        onChange={(e) => setNewKnowledgeTitle(e.target.value)}
                        placeholder="Título (opcional)"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none mb-3"
                      />

                      {/* Type-specific input */}
                      {newKnowledgeType === 'url' && (
                        <>
                          <input
                            type="url"
                            value={newKnowledgeUrl}
                            onChange={(e) => setNewKnowledgeUrl(e.target.value)}
                            placeholder="https://exemplo.com/artigo"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none mb-3"
                          />
                          <button
                            onClick={handleAddUrl}
                            disabled={!newKnowledgeUrl.trim() || processingKnowledge}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                          >
                            {processingKnowledge ? (
                              <>
                                <Icons.Loader size={16} className="animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Icons.Plus size={16} />
                                Adicionar URL
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {newKnowledgeType === 'text' && (
                        <>
                          <textarea
                            value={newKnowledgeText}
                            onChange={(e) => setNewKnowledgeText(e.target.value)}
                            placeholder="Cole ou digite o texto aqui..."
                            rows={6}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none mb-3"
                          />
                          <button
                            onClick={handleAddText}
                            disabled={!newKnowledgeText.trim() || !newKnowledgeTitle.trim() || processingKnowledge}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                          >
                            {processingKnowledge ? (
                              <>
                                <Icons.Loader size={16} className="animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Icons.Plus size={16} />
                                Adicionar Texto
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {newKnowledgeType === 'file' && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={processingKnowledge}
                          className="w-full py-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 transition flex flex-col items-center gap-2"
                        >
                          {processingKnowledge ? (
                            <>
                              <Icons.Loader size={24} className="text-purple-400 animate-spin" />
                              <span className="text-sm text-gray-400">Processando arquivo...</span>
                            </>
                          ) : (
                            <>
                              <Icons.Upload size={24} className="text-gray-400" />
                              <span className="text-sm text-gray-400">Clique para enviar PDF, TXT ou MD</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Knowledge List */}
                  <div className="space-y-3">
                    {knowledge.length === 0 ? (
                      <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                        <Icons.Brain className="mx-auto text-gray-600 mb-3" size={48} />
                        <p className="text-gray-400">Nenhum conhecimento adicionado ainda</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Adicione URLs, textos ou documentos para enriquecer o contexto
                        </p>
                      </div>
                    ) : (
                      knowledge.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition group"
                        >
                          <div className="flex items-start gap-3">
                            <div className={clsx(
                              'w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0',
                              item.type === 'pdf' ? 'bg-red-500/20' :
                              item.type === 'url' ? 'bg-blue-500/20' :
                              item.type === 'text' ? 'bg-green-500/20' :
                              'bg-gray-500/20'
                            )}>
                              {item.type === 'pdf' ? '📄' :
                               item.type === 'url' ? '🔗' :
                               item.type === 'text' ? '📝' :
                               item.type === 'video' ? '🎬' : '📎'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{item.title}</p>
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                {item.content.substring(0, 150)}...
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className={clsx(
                                  'px-2 py-0.5 rounded-full',
                                  item.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                                  item.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                                  item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                )}>
                                  {item.status === 'ready' ? 'Pronto' :
                                   item.status === 'processing' ? 'Processando' :
                                   item.status === 'error' ? 'Erro' : 'Pendente'}
                                </span>
                                <span>{formatCharCount(item.content.length)}</span>
                                {item.source_url && (
                                  <a
                                    href={item.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline truncate max-w-[200px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {new URL(item.source_url).hostname}
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteKnowledgeItem(item)}
                              className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                            >
                              <Icons.Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {detailTab === 'files' && (
                <div className="max-w-4xl">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <Icons.Paperclip size={20} className="text-green-400" />
                      Arquivos do Projeto
                    </h3>
                    <p className="text-sm text-gray-400">
                      Arquivos anexados às conversas deste projeto. Eles ficam disponíveis para referência.
                    </p>
                  </div>

                  {/* File upload zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-green-500 transition cursor-pointer mb-6"
                  >
                    <Icons.Upload className="mx-auto text-gray-500 mb-3" size={32} />
                    <p className="text-gray-400">Arraste arquivos ou clique para enviar</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, TXT, MD, DOC até 10MB</p>
                  </div>

                  {/* File list */}
                  {knowledge.filter(k => k.type === 'pdf' || k.type === 'file').length === 0 ? (
                    <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                      <Icons.File className="mx-auto text-gray-600 mb-3" size={48} />
                      <p className="text-gray-400">Nenhum arquivo no projeto</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {knowledge
                        .filter(k => k.type === 'pdf' || k.type === 'file')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                                {item.type === 'pdf' ? '📄' : '📎'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{item.title}</p>
                                <p className="text-xs text-gray-500">
                                  {item.file_name || 'Arquivo'}
                                </p>
                              </div>
                              <button
                                onClick={() => deleteKnowledgeItem(item)}
                                className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Icons.Trash size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New/Edit Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Folder size={20} className="text-orange-400" />
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h2>
              <button
                onClick={() => { setShowNewProjectModal(false); resetForm(); }}
                className="p-2 text-gray-400 hover:text-white"
              >
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome do projeto *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Campanha Black Friday"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Uma breve descrição do projeto"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setProjectIcon(icon)}
                      className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition border-2',
                        projectIcon === icon
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProjectColor(color)}
                      className={clsx(
                        'w-8 h-8 rounded-lg transition ring-2 ring-offset-2 ring-offset-gray-900',
                        projectColor === color ? 'ring-white' : 'ring-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Instruções (opcional)</label>
                <textarea
                  value={projectInstructions}
                  onChange={(e) => setProjectInstructions(e.target.value)}
                  placeholder="Instruções personalizadas para a IA seguir neste projeto..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => { setShowNewProjectModal(false); resetForm(); }}
                className="flex-1 py-3 text-gray-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveProject}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium transition"
              >
                {editingProject ? 'Salvar' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
