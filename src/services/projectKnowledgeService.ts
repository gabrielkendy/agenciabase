// Project Knowledge Service - Sistema de conhecimento por projeto (igual Claude)
// Suporta localStorage e Supabase para escalabilidade

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ChatProject, ProjectKnowledge } from '../types';

const PROJECTS_KEY = 'base_chat_projects';
const PROJECT_KNOWLEDGE_KEY = 'base_project_knowledge';

class ProjectKnowledgeService {
  // ============================================
  // PROJETOS
  // ============================================

  async getProjects(userId: string): Promise<ChatProject[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('chat_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    }

    // Fallback localStorage
    const stored = localStorage.getItem(PROJECTS_KEY);
    const projects: ChatProject[] = stored ? JSON.parse(stored) : [];
    return projects.filter(p => p.user_id === userId);
  }

  async saveProject(project: ChatProject): Promise<ChatProject> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('chat_projects')
        .upsert([project] as any)
        .select()
        .single();

      if (!error && data) return data;
    }

    // Fallback localStorage
    const stored = localStorage.getItem(PROJECTS_KEY);
    const projects: ChatProject[] = stored ? JSON.parse(stored) : [];
    const existingIndex = projects.findIndex(p => p.id === project.id);

    if (existingIndex >= 0) {
      projects[existingIndex] = { ...projects[existingIndex], ...project, updated_at: new Date().toISOString() };
    } else {
      projects.push(project);
    }

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return project;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    // Deletar conhecimentos do projeto primeiro
    await this.deleteAllKnowledge(projectId);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('chat_projects')
        .delete()
        .eq('id', projectId);

      if (!error) return true;
    }

    // Fallback localStorage
    const stored = localStorage.getItem(PROJECTS_KEY);
    const projects: ChatProject[] = stored ? JSON.parse(stored) : [];
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    return true;
  }

  // ============================================
  // CONHECIMENTO DO PROJETO
  // ============================================

  async getProjectKnowledge(projectId: string): Promise<ProjectKnowledge[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('project_knowledge')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    }

    // Fallback localStorage
    const key = `${PROJECT_KNOWLEDGE_KEY}_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  async addKnowledge(knowledge: Omit<ProjectKnowledge, 'id' | 'created_at'>): Promise<ProjectKnowledge> {
    const newKnowledge: ProjectKnowledge = {
      ...knowledge,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('project_knowledge')
        .insert([newKnowledge] as any)
        .select()
        .single();

      if (!error && data) return data;
    }

    // Fallback localStorage
    const key = `${PROJECT_KNOWLEDGE_KEY}_${knowledge.project_id}`;
    const stored = localStorage.getItem(key);
    const items: ProjectKnowledge[] = stored ? JSON.parse(stored) : [];
    items.unshift(newKnowledge);
    localStorage.setItem(key, JSON.stringify(items));
    return newKnowledge;
  }

  async deleteKnowledge(projectId: string, knowledgeId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('project_knowledge')
        .delete()
        .eq('id', knowledgeId);

      if (!error) return true;
    }

    // Fallback localStorage
    const key = `${PROJECT_KNOWLEDGE_KEY}_${projectId}`;
    const stored = localStorage.getItem(key);
    const items: ProjectKnowledge[] = stored ? JSON.parse(stored) : [];
    const filtered = items.filter(i => i.id !== knowledgeId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  }

  async deleteAllKnowledge(projectId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('project_knowledge')
        .delete()
        .eq('project_id', projectId);
    }

    // Fallback localStorage
    const key = `${PROJECT_KNOWLEDGE_KEY}_${projectId}`;
    localStorage.removeItem(key);
    return true;
  }

  // ============================================
  // PROCESSAMENTO DE CONTEÚDO
  // ============================================

  // Extrair texto de PDF
  async extractPDFText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdfjsLib = (window as any).pdfjsLib;

          if (!pdfjsLib) {
            resolve(`[Documento PDF: ${file.name}]\n\nConteúdo anexado para referência.`);
            return;
          }

          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let text = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }

          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Extrair conteúdo de URL
  async extractURLContent(url: string): Promise<{ title: string; content: string }> {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!data.contents) throw new Error('Sem conteúdo');

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');

      doc.querySelectorAll('script, style, nav, footer, header, aside, iframe').forEach(el => el.remove());

      const title = doc.querySelector('title')?.textContent || new URL(url).hostname;
      const content = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';

      return { title, content: content.substring(0, 50000) };
    } catch (error: any) {
      throw new Error(`Erro ao processar URL: ${error.message}`);
    }
  }

  // ============================================
  // GERAR CONTEXTO DO PROJETO PARA IA
  // ============================================

  async generateProjectContext(projectId: string, project: ChatProject): Promise<string> {
    const knowledge = await this.getProjectKnowledge(projectId);
    const readyItems = knowledge.filter(k => k.status === 'ready');

    if (readyItems.length === 0 && !project.instructions) {
      return '';
    }

    let context = '\n\n════════════════════════════════════════════════════════\n';
    context += `📁 PROJETO: ${project.name.toUpperCase()}\n`;
    context += '════════════════════════════════════════════════════════\n\n';

    if (project.description) {
      context += `📋 Descrição: ${project.description}\n\n`;
    }

    if (project.instructions) {
      context += `📝 INSTRUÇÕES DO PROJETO:\n`;
      context += `────────────────────────────────────────────────────────\n`;
      context += project.instructions + '\n\n';
    }

    if (readyItems.length > 0) {
      context += `📚 BASE DE CONHECIMENTO (${readyItems.length} ${readyItems.length === 1 ? 'fonte' : 'fontes'}):\n`;
      context += `────────────────────────────────────────────────────────\n\n`;

      readyItems.forEach((item, idx) => {
        const icon = item.type === 'pdf' ? '📄' :
          item.type === 'url' ? '🔗' :
            item.type === 'video' ? '🎬' :
              item.type === 'file' ? '📎' : '📝';

        context += `${icon} [${idx + 1}] ${item.title}\n`;

        if (item.source_url) {
          context += `   Fonte: ${item.source_url}\n`;
        }

        context += `   ─────────────────────────────────────────────────\n`;
        context += `   ${item.content.substring(0, 10000)}\n\n`;
      });
    }

    context += '════════════════════════════════════════════════════════\n';
    context += 'Use as informações acima para responder com precisão.\n';
    context += '════════════════════════════════════════════════════════\n';

    return context;
  }

  // ============================================
  // ESTATÍSTICAS
  // ============================================

  async getProjectStats(projectId: string): Promise<{
    totalItems: number;
    readyItems: number;
    totalChars: number;
    types: Record<string, number>;
  }> {
    const knowledge = await this.getProjectKnowledge(projectId);
    const readyItems = knowledge.filter(k => k.status === 'ready');

    const types: Record<string, number> = {};
    knowledge.forEach(k => {
      types[k.type] = (types[k.type] || 0) + 1;
    });

    return {
      totalItems: knowledge.length,
      readyItems: readyItems.length,
      totalChars: readyItems.reduce((acc, k) => acc + k.content.length, 0),
      types,
    };
  }

  // Converter arquivo para base64 (para armazenamento)
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Formatar tamanho de arquivo
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatCharCount(chars: number): string {
    if (chars < 1000) return chars + ' chars';
    if (chars < 1000000) return (chars / 1000).toFixed(1) + 'K chars';
    return (chars / 1000000).toFixed(1) + 'M chars';
  }
}

export const projectKnowledgeService = new ProjectKnowledgeService();
