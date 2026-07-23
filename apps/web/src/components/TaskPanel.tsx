'use client';

import { useTaskStore } from '@/stores/taskStore';
import { cn } from '@/lib/utils';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Image,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const statusConfig = {
  created: { label: '已创建', icon: Clock, color: 'text-muted-foreground' },
  queued: { label: '排队中', icon: Clock, color: 'text-yellow-500' },
  running: { label: '处理中', icon: Loader2, color: 'text-blue-500' },
  succeeded: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
  failed: { label: '失败', icon: XCircle, color: 'text-destructive' },
  retrying: { label: '重试中', icon: Loader2, color: 'text-yellow-500' },
  cancelled: { label: '已取消', icon: XCircle, color: 'text-muted-foreground' },
};

const modalityConfig = {
  llm: { label: 'LLM', icon: MessageSquare },
  image: { label: '图像', icon: Image },
  video: { label: '视频', icon: Video },
};

export function TaskPanel() {
  const { tasks, activeTaskIds, isPanelOpen, setPanelOpen, togglePanel } = useTaskStore();

  const taskList = Array.from(tasks.values()).sort(
    (a, b) => {
      const aTime = a.metadata.started_at || a.metadata.finished_at || '';
      const bTime = b.metadata.started_at || b.metadata.finished_at || '';
      return bTime.localeCompare(aTime);
    },
  );

  const activeCount = taskList.filter(
    (t) => t.status === 'running' || t.status === 'queued',
  ).length;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all"
      >
        <Clock className={cn('w-6 h-6', activeCount > 0 && 'animate-pulse')} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 w-full max-w-md bg-card border-l border-t border-border/50 rounded-t-2xl shadow-2xl transition-transform duration-300',
          isPanelOpen ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ maxHeight: '60vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold">任务队列</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {activeCount} 个进行中
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-accent/50"
            >
              {isPanelOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-accent/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(60vh - 60px)' }}>
          {taskList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无任务</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taskList.map((task) => {
                const status = statusConfig[task.status];
                const modality = modalityConfig[task.modality];
                const StatusIcon = status.icon;
                const ModalityIcon = modality.icon;

                return (
                  <div
                    key={task.task_id}
                    className="p-3 rounded-xl border border-border/50 bg-background/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg bg-accent/50', status.color)}>
                        <StatusIcon
                          className={cn(
                            'w-4 h-4',
                            (task.status === 'running' || task.status === 'retrying') &&
                              'animate-spin',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ModalityIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {modality.label}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            {task.model}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1 line-clamp-1">
                          {(task.input as any)?.prompt || '任务'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn('text-xs font-medium', status.color)}>
                            {status.label}
                          </span>
                          {task.metadata.credits_cost > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {task.metadata.credits_cost} 积分
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
