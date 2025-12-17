import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStudioStore } from '../../../store/studioStore';

export const ScriptNode = memo((_props: NodeProps) => {
  const { script, scriptApproved, approveScript, rejectScript, setScript } = useStudioStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState('');

  const handleEdit = () => {
    setEditedScript(script);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setScript(editedScript);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedScript('');
  };

  const status = script ? (scriptApproved ? 'completed' : 'completed') : 'idle';
  const enabled = !!script;

  return (
    <BaseNode
      type="script"
      title="Roteiro"
      icon="📝"
      status={status}
      approved={scriptApproved}
      enabled={enabled}
    >
      <div className="space-y-3">
        {!script ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando roteiro do Agente IA...
          </p>
        ) : isEditing ? (
          <>
            <textarea
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              className="w-full h-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-mono resize-none focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Icons.Save className="w-4 h-4" />
                Salvar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Icons.X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Script Preview */}
            <div className="max-h-[200px] overflow-y-auto bg-gray-800/50 rounded-lg p-3">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {script.slice(0, 1000)}
                {script.length > 1000 && '...'}
              </pre>
            </div>

            {/* Actions */}
            {!scriptApproved ? (
              <div className="flex gap-2">
                <button
                  onClick={approveScript}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Check className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={rejectScript}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Icons.CheckCircle className="w-4 h-4" />
                  Roteiro aprovado!
                </span>
                <button
                  onClick={() => { rejectScript(); setScript(script); }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Editar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BaseNode>
  );
});

ScriptNode.displayName = 'ScriptNode';
