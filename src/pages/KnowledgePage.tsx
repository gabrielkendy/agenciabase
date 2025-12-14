import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { KnowledgeFile } from '../types';

const API_URL = 'http://localhost:3001/api';

export const KnowledgePage: React.FC = () => {
  const { globalFiles, addGlobalFile, removeGlobalFile, addNotification, setGlobalFiles } = useStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'integrations'>('upload');
  const [manualName, setManualName] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check OAuth status on load
  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const checkOAuthStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/oauth/status`);
      const data = await res.json();
      setGoogleConnected(data.connected);
      if (data.connected) {
        loadDriveFiles();
        loadGmailMessages();
      }
    } catch (err) {
      console.log('Backend not connected');
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch(`${API_URL}/oauth/google`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'width=500,height=600');
        // Poll for connection
        const interval = setInterval(async () => {
          const status = await fetch(`${API_URL}/oauth/status`);
          const statusData = await status.json();
          if (statusData.connected) {
            clearInterval(interval);
            setGoogleConnected(true);
            loadDriveFiles();
            loadGmailMessages();
            addNotification({
              id: Date.now().toString(),
              title: 'Google Conectado! 🎉',
              message: 'Drive e Gmail prontos para importar',
              type: 'success',
              read: false,
              timestamp: new Date()
            });
          }
        }, 2000);
        setTimeout(() => clearInterval(interval), 60000);
      }
    } catch (err) {
      addNotification({
        id: Date.now().toString(),
        title: 'Erro na conexão',
        message: 'Inicie o servidor backend primeiro',
        type: 'error',
        read: false,
        timestamp: new Date()
      });
    }
  };

  const loadDriveFiles = async () => {
    setLoadingDrive(true);
    try {
      const res = await fetch(`${API_URL}/drive/files`);
      const data = await res.json();
      setDriveFiles(data);
    } catch (err) {
      console.error('Error loading drive:', err);
    }
    setLoadingDrive(false);
  };

  const loadGmailMessages = async () => {
    setLoadingGmail(true);
    try {
      const res = await fetch(`${API_URL}/gmail/messages`);
      const data = await res.json();
      setGmailMessages(data);
    } catch (err) {
      console.error('Error loading gmail:', err);
    }
    setLoadingGmail(false);
  };

  const importDriveFile = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/drive/import/${fileId}`, { method: 'POST' });
      const data = await res.json();
      
      addGlobalFile({
        id: data.id,
        name: data.name,
        content: data.content,
        type: 'text',
        source: 'google-drive',
        lastModified: new Date()
      });

      addNotification({
        id: Date.now().toString(),
        title: 'Arquivo Importado! 📁',
        message: `${fileName} do Google Drive`,
        type: 'success',
        read: false,
        timestamp: new Date()
      });
    } catch (err) {
      addNotification({
        id: Date.now().toString(),
        title: 'Erro ao importar',
        message: 'Falha ao importar arquivo do Drive',
        type: 'error',
        read: false,
        timestamp: new Date()
      });
    }
  };

  const importGmailMessage = async (messageId: string, subject: string) => {
    try {
      const res = await fetch(`${API_URL}/gmail/import/${messageId}`, { method: 'POST' });
      const data = await res.json();
      
      addGlobalFile({
        id: data.id,
        name: data.name,
        content: data.content,
        type: 'text',
        source: 'gmail',
        lastModified: new Date()
      });

      addNotification({
        id: Date.now().toString(),
        title: 'Email Importado! 📧',
        message: subject.substring(0, 40),
        type: 'success',
        read: false,
        timestamp: new Date()
      });
    } catch (err) {
      addNotification({
        id: Date.now().toString(),
        title: 'Erro ao importar',
        message: 'Falha ao importar email',
        type: 'error',
        read: false,
        timestamp: new Date()
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const newFile: KnowledgeFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          content,
          type: file.name.endsWith('.json') ? 'json' : file.name.endsWith('.csv') ? 'csv' : 'text',
          source: 'upload',
          lastModified: new Date(),
        };
        addGlobalFile(newFile);
        
        addNotification({
          id: Date.now().toString(),
          title: 'Arquivo Adicionado! 📚',
          message: `${file.name} foi adicionado à base`,
          type: 'success',
          read: false,
          timestamp: new Date()
        });
      };
      reader.readAsText(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddManual = () => {
    if (!manualName || !manualContent) return;
    
    const newFile: KnowledgeFile = {
      id: Date.now().toString(),
      name: manualName.endsWith('.txt') ? manualName : `${manualName}.txt`,
      content: manualContent,
      type: 'text',
      source: 'upload',
      lastModified: new Date(),
    };
    addGlobalFile(newFile);
    
    addNotification({
      id: Date.now().toString(),
      title: 'Texto Adicionado! 📝',
      message: `${newFile.name} foi salvo`,
      type: 'success',
      read: false,
      timestamp: new Date()
    });
    
    setManualName('');
    setManualContent('');
  };

  const handleDelete = (file: KnowledgeFile) => {
    if (confirm(`Remover "${file.name}"?`)) {
      removeGlobalFile(file.id);
      if (previewFile?.id === file.id) setPreviewFile(null);
    }
  };

  return (
    <div className="h-full bg-gray-950 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icons.Drive size={28} className="text-orange-400" />
            Central de Conhecimento
          </h1>
          <p className="text-gray-500 mt-2">
            Conecte Google Drive, Gmail ou faça upload de arquivos para treinar os agentes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Icons.File size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{globalFiles.length}</p>
                <p className="text-xs text-gray-500">Arquivos</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Icons.Drive size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{driveFiles.length}</p>
                <p className="text-xs text-gray-500">No Drive</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Icons.Mail size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{gmailMessages.length}</p>
                <p className="text-xs text-gray-500">Emails</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${googleConnected ? 'bg-green-500/20' : 'bg-gray-700'}`}>
                {googleConnected ? <Icons.Success size={20} className="text-green-400" /> : <Icons.Link size={20} className="text-gray-500" />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{googleConnected ? 'Conectado' : 'Desconectado'}</p>
                <p className="text-xs text-gray-500">Google</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'upload' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Icons.Upload size={18} /> Upload Manual
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'integrations' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Icons.Link size={18} /> Integrações Google
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {activeTab === 'upload' && (
              <>
                {/* Drag & Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-500/5 transition-all"
                >
                  <Icons.Upload size={48} className="mx-auto mb-4 text-orange-400" />
                  <p className="text-white font-medium mb-2">Clique ou arraste arquivos</p>
                  <p className="text-xs text-gray-500">PDF, CSV, JSON, TXT, MD</p>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.csv,.pdf" multiple className="hidden" onChange={handleFileUpload} />
                </div>

                {/* Manual Text */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Icons.Edit size={18} className="text-orange-400" /> Adicionar Texto
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nome do documento"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                    <textarea
                      placeholder="Cole o conteúdo aqui..."
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      rows={5}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleAddManual}
                      disabled={!manualName || !manualContent}
                      className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Icons.Plus size={18} /> Adicionar
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                {/* Connect Button */}
                {!googleConnected && (
                  <div className="bg-gradient-to-r from-blue-900/20 to-red-900/20 rounded-xl border border-blue-500/30 p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Conectar Google</h3>
                    <p className="text-sm text-gray-400 mb-4">Acesse Drive, Gmail e Sheets</p>
                    <button
                      onClick={connectGoogle}
                      className="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-100 flex items-center gap-2 mx-auto"
                    >
                      <Icons.Link size={18} /> Conectar com Google
                    </button>
                    <p className="text-xs text-gray-600 mt-4">
                      ⚠️ Certifique-se que o backend está rodando (npm run dev no /server)
                    </p>
                  </div>
                )}

                {googleConnected && (
                  <>
                    {/* Google Drive */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <Icons.Drive size={20} className="text-yellow-400" /> Google Drive
                        </h3>
                        <button onClick={loadDriveFiles} disabled={loadingDrive} className="text-xs text-orange-400 hover:underline">
                          {loadingDrive ? 'Carregando...' : 'Atualizar'}
                        </button>
                      </div>
                      
                      {driveFiles.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Nenhum documento encontrado</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {driveFiles.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Icons.FileText size={16} className="text-yellow-400" />
                                <span className="text-sm text-white truncate max-w-xs">{file.name}</span>
                              </div>
                              <button
                                onClick={() => importDriveFile(file.id, file.name)}
                                className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg hover:bg-yellow-500/30"
                              >
                                Importar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gmail */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <Icons.Mail size={20} className="text-red-400" /> Gmail
                        </h3>
                        <button onClick={loadGmailMessages} disabled={loadingGmail} className="text-xs text-orange-400 hover:underline">
                          {loadingGmail ? 'Carregando...' : 'Atualizar'}
                        </button>
                      </div>
                      
                      {gmailMessages.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Nenhum email encontrado</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {gmailMessages.map((msg: any) => (
                            <div key={msg.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm text-white truncate">{msg.subject}</p>
                                <p className="text-xs text-gray-500 truncate">{msg.from}</p>
                              </div>
                              <button
                                onClick={() => importGmailMessage(msg.id, msg.subject)}
                                className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/30 flex-shrink-0"
                              >
                                Importar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-fit">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Icons.File size={18} className="text-blue-400" /> Base ({globalFiles.length})
            </h3>
            
            {globalFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Icons.File size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Vazia</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {globalFiles.map(file => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      previewFile?.id === file.id ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}
                    onClick={() => setPreviewFile(file)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        file.source === 'google-drive' ? 'bg-yellow-500/20' :
                        file.source === 'gmail' ? 'bg-red-500/20' : 'bg-blue-500/20'
                      }`}>
                        {file.source === 'google-drive' ? <Icons.Drive size={12} className="text-yellow-400" /> :
                         file.source === 'gmail' ? <Icons.Mail size={12} className="text-red-400" /> :
                         <Icons.File size={12} className="text-blue-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-500">{file.source}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Icons.Delete size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {previewFile && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{previewFile.name}</h4>
                <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                    {previewFile.content.substring(0, 1000)}{previewFile.content.length > 1000 ? '...' : ''}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
