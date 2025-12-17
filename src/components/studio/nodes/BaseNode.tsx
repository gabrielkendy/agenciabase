import { memo, ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_COLORS, StudioNodeType } from '../../../types/studio';
import { Icons } from '../../Icons';

interface BaseNodeProps {
  type: StudioNodeType;
  title: string;
  icon: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  approved: boolean;
  enabled?: boolean;
  children?: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
}

export const BaseNode = memo(({
  type,
  title,
  icon,
  status,
  approved,
  enabled = true,
  children,
  hasInput = true,
  hasOutput = true,
}: BaseNodeProps) => {
  const colors = NODE_COLORS[type];

  return (
    <div
      className={`
        relative min-w-[280px] max-w-[400px] rounded-xl border-2 transition-all
        ${colors.bg} ${colors.border}
        ${!enabled ? 'opacity-50 pointer-events-none' : ''}
        ${status === 'processing' ? 'animate-pulse' : ''}
      `}
    >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-600"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-white/10">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {status === 'processing' && (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <Icons.Loader className="w-3 h-3 animate-spin" />
                Processando...
              </span>
            )}
            {status === 'completed' && !approved && (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Icons.CheckCircle className="w-3 h-3" />
                Aguardando aprovação
              </span>
            )}
            {status === 'completed' && approved && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Icons.CheckCircle className="w-3 h-3" />
                Aprovado
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <Icons.XCircle className="w-3 h-3" />
                Erro
              </span>
            )}
            {status === 'idle' && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Icons.Clock className="w-3 h-3" />
                Aguardando
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {children}
      </div>

      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-600"
        />
      )}

      {/* Approved indicator */}
      {approved && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <Icons.Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
