import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Icons } from '../components/Icons';
import {
  AgentNode,
  ScriptNode,
  NarrationNode,
  ImagePromptsNode,
  ImageGeneratorNode,
  VideoGeneratorNode,
  ExportNode,
} from '../components/studio/nodes';
import { useStudioStore } from '../store/studioStore';
import { NODE_LABELS, StudioNodeType } from '../types/studio';
import toast from 'react-hot-toast';

// Define node types
const nodeTypes: NodeTypes = {
  agent: AgentNode,
  script: ScriptNode,
  narration: NarrationNode,
  imagePrompts: ImagePromptsNode,
  imageGenerator: ImageGeneratorNode,
  videoGenerator: VideoGeneratorNode,
  export: ExportNode,
};

// Initial nodes layout
const initialNodes: Node[] = [
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 50, y: 100 },
    data: { label: 'Agente IA' },
  },
  {
    id: 'script-1',
    type: 'script',
    position: { x: 400, y: 50 },
    data: { label: 'Roteiro' },
  },
  {
    id: 'narration-1',
    type: 'narration',
    position: { x: 400, y: 350 },
    data: { label: 'Narração' },
  },
  {
    id: 'prompts-1',
    type: 'imagePrompts',
    position: { x: 750, y: 50 },
    data: { label: 'Prompts' },
  },
  {
    id: 'images-1',
    type: 'imageGenerator',
    position: { x: 1100, y: 50 },
    data: { label: 'Imagens' },
  },
  {
    id: 'videos-1',
    type: 'videoGenerator',
    position: { x: 1100, y: 350 },
    data: { label: 'Vídeos' },
  },
  {
    id: 'export-1',
    type: 'export',
    position: { x: 1450, y: 200 },
    data: { label: 'Exportar' },
  },
];

// Initial edges
const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'agent-1', target: 'script-1', animated: true },
  { id: 'e2-3', source: 'script-1', target: 'narration-1', animated: true },
  { id: 'e2-4', source: 'script-1', target: 'prompts-1', animated: true },
  { id: 'e4-5', source: 'prompts-1', target: 'images-1', animated: true },
  { id: 'e5-6', source: 'images-1', target: 'videos-1', animated: true },
  { id: 'e6-7', source: 'videos-1', target: 'export-1', animated: true },
  { id: 'e3-7', source: 'narration-1', target: 'export-1', animated: true },
];

// Draggable node item
const DraggableNode = ({ type }: { type: StudioNodeType }) => {
  const nodeInfo = NODE_LABELS[type];

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing transition"
      onDragStart={(e) => onDragStart(e, type)}
      draggable
    >
      <span className="text-lg">{nodeInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium truncate">{nodeInfo.title}</p>
      </div>
    </div>
  );
};

export const CreatorStudioPage = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [projectName, setProjectName] = useState('Novo Projeto');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { resetStudio } = useStudioStore();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: NODE_LABELS[type as StudioNodeType]?.title || type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar o projeto? Isso apagará todo o progresso.')) {
      resetStudio();
      setNodes(initialNodes);
      setEdges(initialEdges);
      toast.success('Projeto resetado!');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Icons.Video className="text-white" size={18} />
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-none text-white font-semibold text-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition flex items-center gap-2"
          >
            <Icons.Refresh className="w-4 h-4" />
            Resetar
          </button>
          <button
            onClick={() => toast.success('Projeto salvo!')}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition flex items-center gap-2"
          >
            <Icons.Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Nodes Palette */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 p-3 space-y-4 overflow-y-auto">
          {/* Entry */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold mb-2 px-1">Entrada</h3>
            <div className="space-y-1">
              <DraggableNode type="agent" />
            </div>
          </div>

          {/* Processing */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold mb-2 px-1">Processamento</h3>
            <div className="space-y-1">
              <DraggableNode type="script" />
              <DraggableNode type="imagePrompts" />
            </div>
          </div>

          {/* Generation */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold mb-2 px-1">Geração</h3>
            <div className="space-y-1">
              <DraggableNode type="narration" />
              <DraggableNode type="imageGenerator" />
              <DraggableNode type="videoGenerator" />
            </div>
          </div>

          {/* Output */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-semibold mb-2 px-1">Saída</h3>
            <div className="space-y-1">
              <DraggableNode type="export" />
            </div>
          </div>

          {/* Help */}
          <div className="bg-gray-800/50 rounded-lg p-3 mt-4">
            <h4 className="text-xs text-gray-400 font-semibold mb-2">Como usar:</h4>
            <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
              <li>Converse com o Agente IA</li>
              <li>Aprove o roteiro gerado</li>
              <li>Gere a narração</li>
              <li>Gere os prompts de imagens</li>
              <li>Gere as 12 imagens</li>
              <li>Gere os 12 vídeos</li>
              <li>Exporte tudo!</li>
            </ol>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-950"
            defaultEdgeOptions={{
              style: { stroke: '#4b5563', strokeWidth: 2 },
              animated: true,
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#374151"
            />
            <Controls
              className="!bg-gray-800 !border-gray-700 !rounded-lg"
              showInteractive={false}
            />
            <Panel position="bottom-center" className="!bg-transparent">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/90 backdrop-blur rounded-full border border-gray-800">
                <span className="text-xs text-gray-400">Creator Studio</span>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-500">Arraste os nós para reorganizar</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};
