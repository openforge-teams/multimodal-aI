import { prisma } from '@dreamforge/db';
import type { TaskHandle } from '@dreamforge/types';

// 安全 JSON 解析
function safeParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

export {
  createTask,
  updateTaskStatus,
  updateTaskOutput,
  getTask,
  getTasks,
  cancelTask,
  dbToTaskHandle,
};

function dbToTaskHandle(db: any): TaskHandle {
  return {
    task_id: db.id,
    provider: db.provider,
    model: db.model,
    modality: db.modality as TaskHandle['modality'],
    status: db.status as TaskHandle['status'],
    input: safeParse(db.input, {}),
    output: db.output ? safeParse(db.output, undefined) : undefined,
    metadata: {
      credits_cost: db.creditsCost,
      started_at: db.startedAt?.toISOString(),
      finished_at: db.finishedAt?.toISOString(),
    },
    error: db.errorCode
      ? {
          code: db.errorCode,
          message: db.errorMessage || '',
          retryable: db.retryable ?? false,
        }
      : undefined,
  };
}

interface CreateTaskParams {
  userId: string;
  provider: string;
  model: string;
  modality: string;
  input: Record<string, unknown>;
  parentTaskId?: string;
  workflowNodeId?: string;
}

async function createTask(params: CreateTaskParams): Promise<TaskHandle> {
  const task = await prisma.task.create({
    data: {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      modality: params.modality,
      status: 'created',
      input: safeStringify(params.input),
      parentTaskId: params.parentTaskId,
      workflowNodeId: params.workflowNodeId,
    },
  });

  return dbToTaskHandle(task);
}

async function updateTaskStatus(
  taskId: string,
  status: string,
  extra?: any,
): Promise<TaskHandle> {
  const data: any = { status };

  if (status === 'running' && !extra?.startedAt) {
    data.startedAt = new Date();
  }
  if ((status === 'succeeded' || status === 'failed' || status === 'cancelled') && !extra?.finishedAt) {
    data.finishedAt = new Date();
  }

  if (extra) {
    Object.assign(data, extra);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
  });

  return dbToTaskHandle(task);
}

async function updateTaskOutput(
  taskId: string,
  output: Record<string, unknown>,
  creditsCost?: number,
): Promise<TaskHandle> {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      output: safeStringify(output),
      ...(creditsCost !== undefined ? { creditsCost } : {}),
    },
  });

  return dbToTaskHandle(task);
}

async function getTask(taskId: string): Promise<TaskHandle | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  return task ? dbToTaskHandle(task) : null;
}

interface ListTasksParams {
  userId: string;
  status?: string;
  modality?: string;
  limit?: number;
  offset?: number;
}

async function getTasks(params: ListTasksParams): Promise<TaskHandle[]> {
  const tasks = await prisma.task.findMany({
    where: {
      userId: params.userId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.modality ? { modality: params.modality } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
  });

  return tasks.map(dbToTaskHandle);
}

async function cancelTask(taskId: string): Promise<TaskHandle | null> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'cancelled') {
    return dbToTaskHandle(task);
  }

  return updateTaskStatus(taskId, 'cancelled');
}
