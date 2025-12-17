// Knowledge Service - Sistema de treinamento de agentes com conhecimento
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface KnowledgeItem {
  id: string;
  agent_id: string;
  type: 'pdf' | 'url' | 'text' | 'video';
  title: string;
  content: string;
  source_url?: string;
  file_name?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message?: string;
  created_at: string;
}

export interface TrainingStatus {
  total_items: number;
  ready_items: number;
  total_chars: number;
  is_trained: boolean;
  last_trained?: string;
}

class KnowledgeService {
  // Extrair texto de PDF
  async extractPDFText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          // Usar pdf.js via CDN
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            // Fallback: retornar nome do arquivo como placeholder
            resolve(`[Conteúdo do PDF: ${file.name}]`);
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
      // Usar proxy CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) throw new Error('Sem conteúdo');
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // Remover elementos desnecessários
      doc.querySelectorAll('script, style, nav, footer, header, aside, iframe').forEach(el => el.remove());
      
      const title = doc.querySelector('title')?.textContent || new URL(url).hostname;
      const content = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
      
      return { title, content: content.substring(0, 30000) };
    } catch (error: any) {
      throw new Error(`Erro ao processar URL: ${error.message}`);
    }
  }

  // Extrair info do YouTube
  extractYouTubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Salvar conhecimento (Supabase ou localStorage)
  async saveKnowledge(agentId: string, item: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    const newItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      type: item.type || 'text',
      title: item.title || 'Sem título',
      content: item.content || '',
      source_url: item.source_url,
      file_name: item.file_name,
      status: 'ready',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const result = await supabase
        .from('agent_knowledge')
        .insert([newItem] as any)
        .select()
        .single();

      if (result.error) {
        console.error('Erro Supabase:', result.error);
        // Fallback para localStorage
        return this.saveToLocalStorage(newItem);
      }
      return result.data as KnowledgeItem;
    }

    return this.saveToLocalStorage(newItem);
  }

  // Salvar no localStorage
  private saveToLocalStorage(item: KnowledgeItem): KnowledgeItem {
    const key = `knowledge_${item.agent_id}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(item);
    localStorage.setItem(key, JSON.stringify(existing));
    return item;
  }

  // Buscar conhecimentos do agente
  async getAgentKnowledge(agentId: string): Promise<KnowledgeItem[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('agent_knowledge')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (!error && data) return data;
    }

    // Fallback localStorage
    const key = `knowledge_${agentId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  // Deletar conhecimento
  async deleteKnowledge(agentId: string, itemId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('agent_knowledge')
        .delete()
        .eq('id', itemId);
      
      if (!error) return true;
    }

    // Fallback localStorage
    const key = `knowledge_${agentId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((item: KnowledgeItem) => item.id !== itemId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  }

  // Gerar prompt de conhecimento para injetar no agente
  generateKnowledgePrompt(items: KnowledgeItem[]): string {
    const readyItems = items.filter(i => i.status === 'ready');
    if (readyItems.length === 0) return '';

    let prompt = '\n\n═══════════════════════════════════════\n';
    prompt += '📚 BASE DE CONHECIMENTO TREINADA\n';
    prompt += 'Use estas informações para responder com precisão:\n';
    prompt += '═══════════════════════════════════════\n\n';

    readyItems.forEach((item, idx) => {
      const icon = item.type === 'pdf' ? '📄' : item.type === 'url' ? '🔗' : item.type === 'video' ? '🎬' : '📝';
      prompt += `${icon} [${idx + 1}] ${item.title}\n`;
      prompt += `────────────────────────────────────────\n`;
      prompt += item.content.substring(0, 8000) + '\n\n';
    });

    prompt += '═══════════════════════════════════════\n';
    prompt += 'FIM DA BASE DE CONHECIMENTO\n';
    prompt += '═══════════════════════════════════════\n';

    return prompt;
  }

  // Obter status do treinamento
  getTrainingStatus(items: KnowledgeItem[]): TrainingStatus {
    const readyItems = items.filter(i => i.status === 'ready');
    const totalChars = readyItems.reduce((acc, i) => acc + i.content.length, 0);
    const lastTrained = readyItems.length > 0 
      ? readyItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      : undefined;

    return {
      total_items: items.length,
      ready_items: readyItems.length,
      total_chars: totalChars,
      is_trained: readyItems.length > 0,
      last_trained: lastTrained,
    };
  }
}

export const knowledgeService = new KnowledgeService();
