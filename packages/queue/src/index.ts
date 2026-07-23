import type { TaskModality } from '@dreamforge/types';

const QUEUE_NAMES = {
  image: 'dreamforge:image-tasks',
  video: 'dreamforge:video-tasks',
  llm: 'dreamforge:llm-tasks',
  poll: 'dreamforge:poll-tasks',
} as const;

export interface TaskPayload {
  taskId: string;
  userId: string;
  provider: string;
  model: string;
  modality: TaskModality;
  request: Record<string, unknown>;
  requestType: string;
}

export interface Job<T = TaskPayload> {
  id: string;
  data: T;
  name: string;
}

type Handler = (job: Job<TaskPayload>) => Promise<void>;

// 内存队列存储
const queues: Record<string, TaskPayload[]> = {};
const workers: Record<string, Handler> = {};
const delayedJobs: Map<string, { payload: TaskPayload; runAt: number }> = new Map();
let processing = false;

function getQueueName(modality: TaskModality): string {
  return QUEUE_NAMES[modality] || QUEUE_NAMES.image;
}

function ensureQueue(name: string): TaskPayload[] {
  if (!queues[name]) {
    queues[name] = [];
  }
  return queues[name];
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    // 处理延迟任务
    const now = Date.now();
    for (const [id, job] of delayedJobs) {
      if (job.runAt <= now) {
        const queueName = getQueueName(job.payload.modality);
        ensureQueue(queueName).push(job.payload);
        delayedJobs.delete(id);
      }
    }

    // 处理队列中的任务
    for (const [queueName, queue] of Object.entries(queues)) {
      const handler = workers[queueName];
      if (!handler) continue;

      while (queue.length > 0) {
        const payload = queue.shift()!;
        const job: Job<TaskPayload> = {
          id: payload.taskId,
          data: payload,
          name: `task:${payload.taskId}`,
        };

        try {
          await handler(job);
        } catch (error) {
          console.error(`[Queue] Error processing job ${job.id}:`, error);
        }
      }
    }
  } finally {
    processing = false;
  }
}

// 定时处理队列
setInterval(() => {
  processQueue().catch(console.error);
}, 500);

export function getQueue(modality: TaskModality) {
  const name = getQueueName(modality);
  ensureQueue(name);
  return {
    name,
    add: async (name: string, payload: TaskPayload, opts?: { jobId?: string }) => {
      ensureQueue(getQueueName(modality)).push(payload);
      return { id: opts?.jobId || payload.taskId };
    },
  };
}

export async function enqueueTask(
  payload: TaskPayload,
  priority?: number,
): Promise<string> {
  const queueName = getQueueName(payload.modality);
  ensureQueue(queueName).push(payload);
  return payload.taskId;
}

export function createWorker(
  modality: TaskModality,
  handler: Handler,
): { name: string } {
  const name = getQueueName(modality);
  workers[name] = handler;
  return { name };
}

export function createPollWorker(handler: Handler): { name: string } {
  const name = QUEUE_NAMES.poll;
  workers[name] = handler;
  return { name };
}

export async function enqueuePollTask(
  payload: TaskPayload,
  delay: number = 5000,
): Promise<string> {
  const id = `poll:${payload.taskId}`;
  delayedJobs.set(id, {
    payload: { ...payload, modality: payload.modality },
    runAt: Date.now() + delay,
  });
  // 使用原始模态的队列名
  return id;
}

export async function cancelJob(taskId: string, modality: TaskModality): Promise<void> {
  const queueName = getQueueName(modality);
  const queue = queues[queueName];
  if (queue) {
    const idx = queue.findIndex((j) => j.taskId === taskId);
    if (idx >= 0) queue.splice(idx, 1);
  }
  delayedJobs.delete(`poll:${taskId}`);
}

export async function getQueueStats(modality: TaskModality): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queueName = getQueueName(modality);
  return {
    waiting: queues[queueName]?.length || 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: Array.from(delayedJobs.values()).filter(
      (j) => getQueueName(j.payload.modality) === queueName,
    ).length,
  };
}

export async function closeAll(): Promise<void> {
  // 内存队列不需要清理
}

export { QUEUE_NAMES };
