import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  StudioProject,
  StudioNode,
  StudioEdge,
  GeneratedImage,
  GeneratedVideo,
  ImagePrompt,
} from '../types/studio';

interface StudioState {
  // Projects
  projects: StudioProject[];
  currentProjectId: string | null;

  // Current flow data
  script: string;
  scriptApproved: boolean;
  narrationUrl: string | null;
  narrationApproved: boolean;
  imagePrompts: ImagePrompt[];
  imagePromptsApproved: boolean;
  generatedImages: GeneratedImage[];
  imagesApproved: boolean;
  generatedVideos: GeneratedVideo[];
  videosApproved: boolean;

  // Processing states
  isGeneratingScript: boolean;
  isGeneratingNarration: boolean;
  isGeneratingImages: boolean;
  isGeneratingVideos: boolean;

  // Selected voice
  selectedVoiceId: string;

  // Actions - Projects
  createProject: (name: string) => string;
  updateProject: (id: string, data: Partial<StudioProject>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => StudioProject | null;

  // Actions - Nodes & Edges
  updateNodes: (nodes: StudioNode[]) => void;
  updateEdges: (edges: StudioEdge[]) => void;

  // Actions - Script
  setScript: (script: string) => void;
  approveScript: () => void;
  rejectScript: () => void;
  setIsGeneratingScript: (value: boolean) => void;

  // Actions - Narration
  setNarrationUrl: (url: string | null) => void;
  approveNarration: () => void;
  rejectNarration: () => void;
  setIsGeneratingNarration: (value: boolean) => void;
  setSelectedVoiceId: (voiceId: string) => void;

  // Actions - Image Prompts
  setImagePrompts: (prompts: ImagePrompt[]) => void;
  updateImagePrompt: (id: string, text: string) => void;
  approveImagePrompts: () => void;
  rejectImagePrompts: () => void;

  // Actions - Images
  setGeneratedImages: (images: GeneratedImage[]) => void;
  updateGeneratedImage: (id: string, data: Partial<GeneratedImage>) => void;
  approveImage: (id: string) => void;
  rejectImage: (id: string) => void;
  approveAllImages: () => void;
  setIsGeneratingImages: (value: boolean) => void;

  // Actions - Videos
  setGeneratedVideos: (videos: GeneratedVideo[]) => void;
  updateGeneratedVideo: (id: string, data: Partial<GeneratedVideo>) => void;
  approveVideo: (id: string) => void;
  rejectVideo: (id: string) => void;
  approveAllVideos: () => void;
  setIsGeneratingVideos: (value: boolean) => void;

  // Actions - Reset
  resetStudio: () => void;
}

const initialState = {
  projects: [],
  currentProjectId: null,
  script: '',
  scriptApproved: false,
  narrationUrl: null,
  narrationApproved: false,
  imagePrompts: [],
  imagePromptsApproved: false,
  generatedImages: [],
  imagesApproved: false,
  generatedVideos: [],
  videosApproved: false,
  isGeneratingScript: false,
  isGeneratingNarration: false,
  isGeneratingImages: false,
  isGeneratingVideos: false,
  selectedVoiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel (default)
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Projects
      createProject: (name) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const project: StudioProject = {
          id,
          name,
          nodes: [],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          projects: [...state.projects, project],
          currentProjectId: id,
        }));
        return id;
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id });
        if (id) {
          // Reset studio state when switching projects
          get().resetStudio();
        }
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId) || null;
      },

      // Nodes & Edges
      updateNodes: (nodes) => {
        const { currentProjectId, projects } = get();
        if (currentProjectId) {
          set({
            projects: projects.map((p) =>
              p.id === currentProjectId
                ? { ...p, nodes, updatedAt: new Date().toISOString() }
                : p
            ),
          });
        }
      },

      updateEdges: (edges) => {
        const { currentProjectId, projects } = get();
        if (currentProjectId) {
          set({
            projects: projects.map((p) =>
              p.id === currentProjectId
                ? { ...p, edges, updatedAt: new Date().toISOString() }
                : p
            ),
          });
        }
      },

      // Script
      setScript: (script) => set({ script, scriptApproved: false }),
      approveScript: () => set({ scriptApproved: true }),
      rejectScript: () => set({ script: '', scriptApproved: false }),
      setIsGeneratingScript: (value) => set({ isGeneratingScript: value }),

      // Narration
      setNarrationUrl: (url) => set({ narrationUrl: url, narrationApproved: false }),
      approveNarration: () => set({ narrationApproved: true }),
      rejectNarration: () => set({ narrationUrl: null, narrationApproved: false }),
      setIsGeneratingNarration: (value) => set({ isGeneratingNarration: value }),
      setSelectedVoiceId: (voiceId) => set({ selectedVoiceId: voiceId }),

      // Image Prompts
      setImagePrompts: (prompts) => set({ imagePrompts: prompts, imagePromptsApproved: false }),
      updateImagePrompt: (id, text) => {
        set((state) => ({
          imagePrompts: state.imagePrompts.map((p) =>
            p.id === id ? { ...p, text } : p
          ),
        }));
      },
      approveImagePrompts: () => set({ imagePromptsApproved: true }),
      rejectImagePrompts: () => set({ imagePrompts: [], imagePromptsApproved: false }),

      // Images
      setGeneratedImages: (images) => set({ generatedImages: images, imagesApproved: false }),
      updateGeneratedImage: (id, data) => {
        set((state) => ({
          generatedImages: state.generatedImages.map((img) =>
            img.id === id ? { ...img, ...data } : img
          ),
        }));
      },
      approveImage: (id) => {
        set((state) => ({
          generatedImages: state.generatedImages.map((img) =>
            img.id === id ? { ...img, approved: true } : img
          ),
        }));
      },
      rejectImage: (id) => {
        set((state) => ({
          generatedImages: state.generatedImages.map((img) =>
            img.id === id ? { ...img, approved: false, status: 'pending' } : img
          ),
        }));
      },
      approveAllImages: () => {
        set((state) => ({
          generatedImages: state.generatedImages.map((img) => ({ ...img, approved: true })),
          imagesApproved: true,
        }));
      },
      setIsGeneratingImages: (value) => set({ isGeneratingImages: value }),

      // Videos
      setGeneratedVideos: (videos) => set({ generatedVideos: videos, videosApproved: false }),
      updateGeneratedVideo: (id, data) => {
        set((state) => ({
          generatedVideos: state.generatedVideos.map((vid) =>
            vid.id === id ? { ...vid, ...data } : vid
          ),
        }));
      },
      approveVideo: (id) => {
        set((state) => ({
          generatedVideos: state.generatedVideos.map((vid) =>
            vid.id === id ? { ...vid, approved: true } : vid
          ),
        }));
      },
      rejectVideo: (id) => {
        set((state) => ({
          generatedVideos: state.generatedVideos.map((vid) =>
            vid.id === id ? { ...vid, approved: false, status: 'pending' } : vid
          ),
        }));
      },
      approveAllVideos: () => {
        set((state) => ({
          generatedVideos: state.generatedVideos.map((vid) => ({ ...vid, approved: true })),
          videosApproved: true,
        }));
      },
      setIsGeneratingVideos: (value) => set({ isGeneratingVideos: value }),

      // Reset
      resetStudio: () => {
        set({
          script: '',
          scriptApproved: false,
          narrationUrl: null,
          narrationApproved: false,
          imagePrompts: [],
          imagePromptsApproved: false,
          generatedImages: [],
          imagesApproved: false,
          generatedVideos: [],
          videosApproved: false,
          isGeneratingScript: false,
          isGeneratingNarration: false,
          isGeneratingImages: false,
          isGeneratingVideos: false,
        });
      },
    }),
    { name: 'creator-studio-store' }
  )
);
