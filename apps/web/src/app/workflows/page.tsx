'use client';

import { AppLayout } from '@/components/AppLayout';
import {
  Layers,
  Plus,
  Play,
  Sparkles,
  Image,
  Video,
  ArrowRight,
} from 'lucide-react';

const templates = [
  {
    name: '创意到视频',
    desc: 'LLM 生成 Brief → 参考图 → 视频生成',
    steps: 4,
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: '产品图生成',
    desc: '批量生成高质量产品展示图',
    steps: 2,
    icon: Image,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: '角色一致性',
    desc: '保持角色形象一致的多图生成',
    steps: 3,
    icon: Layers,
    color: 'from-orange-500 to-red-500',
  },
  {
    name: '故事板视频',
    desc: '多镜头叙事视频生成',
    steps: 5,
    icon: Video,
    color: 'from-green-500 to-emerald-500',
  },
];

export default function WorkflowsPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        {/* Header */}
        <div className="px-8 py-8 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Layers className="w-7 h-7 text-primary" />
                工作流
              </h1>
              <p className="text-muted-foreground mt-1">
                可视化编排多步骤创作流程，LLM 导演 + 图像 + 视频
              </p>
            </div>
            <button className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建工作流
            </button>
          </div>
        </div>

        <div className="p-8 space-y-10">
          {/* Templates */}
          <section>
            <h2 className="text-lg font-semibold mb-4">模板库</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div
                  key={template.name}
                  className="group p-5 rounded-2xl border border-border/50 bg-card hover:bg-accent/30 transition-all cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4`}
                  >
                    <template.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{template.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{template.steps} 个步骤</span>
                    <button className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      使用模板 <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Canvas Placeholder */}
          <section>
            <h2 className="text-lg font-semibold mb-4">我的工作流</h2>
            <div className="p-12 rounded-2xl border border-dashed border-border/50 text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg text-muted-foreground">还没有创建工作流</p>
              <p className="text-sm text-muted-foreground mt-1">
                选择一个模板开始，或从零创建你的第一个工作流
              </p>
              <button className="mt-6 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
                <Play className="w-4 h-4" />
                创建工作流
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
