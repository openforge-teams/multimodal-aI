'use client';

import { Wand2 } from 'lucide-react';

export default function CanvasPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3">智能画布</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          消除笔、局部重绘、无损扩图、高清放大 — 像专业设计师一样编辑你的图像。
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm border border-amber-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          正在开发中
        </div>
      </div>
    </div>
  );
}
