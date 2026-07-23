import { Queue, Worker, QueueEvents, type Job } from 'bullmq';
import Redis from 'ioredis';
import type { TaskModality } from '@dreamforge/types';

let connection: Redis | null = null;

const QUEUE_NAMES = {
  image: 'dreamforge:image-tasks',
  video: 'dreamforge:video-tasks',
  llm: 'dreamforge:llm-tasks',
  poll: 'dreamforge:poll-tasks',
} as const;

function getConnection(): Redis {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  return connection;
}

export interface TaskPayload {
  taskId: string;
  userId: string;
  provider: string;
  model: string;
  modality: TaskModality;
  request: Record<string, unknown>;
  requestType: string;
}

const queues: Record<string, Queue<TaskPayload>> = {};
const workers: Record<string, Worker<TaskPayload>> = {};
const queueEvents: Record<string, QueueEvents> = {};

function getQueueName(modality: TaskModality): string {
  return QUEUE_NAMES[modality] || QUEUE_NAMES.image;
}

export function getQueue(modality: TaskModality): Queue<TaskPayload> {
  const name = getQueueName(modality);
  if (!queues[name]) {
    queues[name] = new Queue<TaskPayload>(name, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
  }
  return queues[name];
}

export async function enqueueTask(
  payload: TaskPayload,
  priority?: number,
): Promise<string> {
  const queue = getQueue(payload.modality);
  const job = await queue.add(`task:${payload.taskId}`, payload, {
    jobId: payload.taskId,
    priority,
  });
  return job.id as string;
}

export function createWorker(
  modality: TaskModality,
  handler: (job: Job<TaskPayload>) => Promise<void>,
): Worker<TaskPayload> {
  const name = getQueueName(modality);
  if (workers[name]) {
    return workers[name];
  }

  const concurrency = parseInt(
    process.env.TASK_MAX_CONCURRENCY || '10',
    10,
  );

  workers[name] = new Worker<TaskPayload>(name, handler, {
    connection: getConnection(),
    concurrency,
  });

  // 创建队列事件
  if (!queueEvents[name]) {
    queueEvents[name] = new QueueEvents(name, {
      connection: getConnection(),
    });
  }

  return workers[name];
}

export function createPollWorker(
  handler: (job: Job<TaskPayload>) => Promise<void>,
): Worker<TaskPayload> {
  const name = QUEUE_NAMES.poll;
  if (workers[name]) {
    return workers[name];
  }

  workers[name] = new Worker<TaskPayload>(name, handler, {
    connection: getConnection(),
    concurrency: 20,
  });

  if (!queueEvents[name]) {
    queueEvents[name] = new QueueEvents(name, {
      connection: getConnection(),
    });
  }

  return workers[name];
}

export async function enqueuePollTask(
  payload: TaskPayload,
  delay: number = 5000,
): Promise<string> {
  const name = QUEUE_NAMES.poll;
  if (!queues[name]) {
    queues[name] = new Queue<TaskPayload>(name, {
      connection: getConnection(),
    });
  }

  const job = await queues[name].add(`poll:${payload.taskId}`, payload, {
    jobId: `poll:${payload.taskId}`,
    delay,
    removeOnComplete: true,
    removeOnFail: true,
  });

  return job.id as string;
}

export async function cancelJob(taskId: string, modality: TaskModality): Promise<void> {
  const queue = getQueue(modality);
  const job = await queue.getJob(taskId);
  if (job) {
    await job.remove();
  }
}

export async function getQueueStats(modality: TaskModality): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(modality);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function closeAll(): Promise<void> {
  await Promise.all([
    ...Object.values(queues).map((q) => q.close()),
    ...Object.values(workers).map((w) => w.close()),
    ...Object.values(queueEvents).map((e) => e.close()),
  ]);

  if (connection) {
    await connection.quit();
    connection = null;
  }
}

export { QUEUE_NAMES };
