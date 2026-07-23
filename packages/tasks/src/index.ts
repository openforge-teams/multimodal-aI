import { prisma, type Task, type TaskStatus, type TaskModality } from '@dreamforge/db';
import type { TaskHandle } from '@dreamforge/types';

export {
  createTask,
  updateTaskStatus,
  updateTaskOutput,
  getTask,
  getTasks,
  cancelTask,
  taskHandleToDb,
  dbToTaskHandle,
};

function dbToTaskHandle(db: Task): TaskHandle {
  return {
    task_id: db.id,
    provider: db.provider,
    model: db.model,
    modality: db.modality as TaskHandle['modality'],
    status: db.status as TaskHandle['status'],
    input: (db.input as Record<string, unknown>) || {},
    output: db.output ? (db.output as Record<string, unknown>) : undefined,
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

function taskHandleToDb(handle: TaskHandle): Partial<Task> {
  return {
    id: handle.task_id,
    provider: handle.provider,
    model: handle.model,
    modality: handle.modality as TaskModality,
    status: handle.status as TaskStatus,
    input: handle.input as any,
    output: handle.output as any,
    creditsCost: handle.metadata.credits_cost,
    startedAt: handle.metadata.started_at ? new Date(handle.metadata.started_at) : undefined,
    finishedAt: handle.metadata.finished_at ? new Date(handle.metadata.finished_at) : undefined,
    errorCode: handle.error?.code,
    errorMessage: handle.error?.message,
    retryable: handle.error?.retryable,
  };
}

interface CreateTaskParams {
  userId: string;
  provider: string;
  model: string;
  modality: TaskModality;
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
      input: params.input as any,
      parentTaskId: params.parentTaskId,
      workflowNodeId: params.workflowNodeId,
    },
  });

  return dbToTaskHandle(task);
}

async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  extra?: Partial<Task>,
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
      output: output as any,
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
  status?: TaskStatus;
  modality?: TaskModality;
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
