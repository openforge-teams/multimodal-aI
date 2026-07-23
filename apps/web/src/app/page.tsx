import Link from 'next/link';
import { Sparkles, Image, Video, Wand2, Layers, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">DreamForge</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              创作工作台
            </Link>
            <Link href="/assets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              资产库
            </Link>
            <Link href="/settings/providers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              提供商
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              登录
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              免费开始
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            多模态 AI 创作平台
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            让创意
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              {' '}自由流动
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            基于 LobeHub 式"任意 LLM 接入"的理念，
            向前再走一步——允许你自由组合任意文字 API + 任意图像 API + 任意视频 API，
            构建端到端的创作流水线。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              立即开始创作
            </Link>
            <Link
              href="/studio"
              className="px-8 py-3 rounded-xl border border-border bg-card hover:bg-card/80 font-semibold transition-colors"
            >
              查看演示
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">核心能力</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            一个平台，满足你从创意构思到成片输出的全部需求
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Image,
                title: '文生图 / 图生图',
                desc: '支持 SD、FLUX、DALL·E、Kolors、Seedream 等任意图像 API，智能润色提示词',
              },
              {
                icon: Video,
                title: '文生视频 / 图生视频',
                desc: '接入 Wan、Kling、Luma、Seedance 等视频模型，支持首尾帧精确控制',
              },
              {
                icon: Wand2,
                title: '智能画布',
                desc: '消除笔、局部重绘、无损扩图、高清放大，像专业设计师一样编辑',
              },
              {
                icon: Layers,
                title: '流水线编排',
                desc: 'LLM 导演 + 图像生成 + 视频生成，可视化节点串起你的创作流程',
              },
              {
                icon: Shield,
                title: '完全自托管',
                desc: '数据、模型、资产全部在你掌控中，支持私有化部署和区域路由',
              },
              {
                icon: Zap,
                title: '开放生态',
                desc: '任何兼容 OpenAI 协议的提供商都能接入，Provider 市场持续扩展',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
            <span>DreamForge © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">
              文档
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              隐私政策
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
