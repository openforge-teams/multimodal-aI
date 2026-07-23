'use client';

import { create } from 'zustand';
import type { TaskHandle } from '@dreamforge/types';

interface TaskStore {
  tasks: Map<string, TaskHandle>;
  activeTaskIds: string[];
  isPanelOpen: boolean;

  addTask: (task: TaskHandle) => void;
  updateTask: (taskId: string, updates: Partial<TaskHandle>) => void;
  removeTask: (taskId: string) => void;
  setTasks: (tasks: TaskHandle[]) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: new Map(),
  activeTaskIds: [],
  isPanelOpen: false,

  addTask: (task) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.set(task.task_id, task);
      const newActiveIds = state.activeTaskIds.includes(task.task_id)
        ? state.activeTaskIds
        : [...state.activeTaskIds, task.task_id];
      return { tasks: newTasks, activeTaskIds: newActiveIds };
    });
  },

  updateTask: (taskId, updates) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      const existing = newTasks.get(taskId);
      if (existing) {
        newTasks.set(taskId, { ...existing, ...updates });
      }
      return { tasks: newTasks };
    });
  },

  removeTask: (taskId) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.delete(taskId);
      return {
        tasks: newTasks,
        activeTaskIds: state.activeTaskIds.filter((id) => id !== taskId),
      };
    });
  },

  setTasks: (tasks) => {
    const taskMap = new Map(tasks.map((t) => [t.task_id, t]));
    set({ tasks: taskMap, activeTaskIds: tasks.map((t) => t.task_id) });
  },

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
}));
