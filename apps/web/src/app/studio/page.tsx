'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { trpc } from '@/lib/trpc-provider';
import {
  Sparkles,
  Image,
  Video,
  Wand2,
  Layers,
  ArrowRight,
  Clock,
  Coins,
  Zap,
} from 'lucide-react';

export default function StudioPage() {
  const { data: providers = [] } = trpc.provider.list.useQuery();
  const { data: imageAssets = [] } = trpc.asset.list.useQuery({ type: 'image', limit: 6 });
  const { data: creditsData } = trpc.credits.getBalance.useQuery();

  const quickActions = [
    {
      icon: Image,
      title: '文生图',
      desc: '用文字描述生成精美图像',
      href: '/image',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Video,
      title: '文生视频',
      desc: '让你的创意动起来',
      href: '/video',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Wand2,
      title: '智能画布',
      desc: '局部重绘、消除笔、扩图',
      href: '/canvas',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Layers,
      title: '流水线',
      desc: 'LLM 导演 + 多步骤编排',
      href: '/workflows',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-pink-500/10" />
          <div className="relative px-8 py-12">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Sparkles className="w-4 h-4" />
                  欢迎回来
                </div>
                <h1 className="text-3xl font-bold mb-2">开始你的创作</h1>
                <p className="text-muted-foreground">
                  组合任意 LLM + 图像 + 视频 API，构建端到端的创作流水线
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-3 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    积分余额
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {creditsData?.balance ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 space-y-10">
          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold mb-4">快速开始</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group p-5 rounded-2xl border border-border/50 bg-card hover:bg-accent/30 transition-all hover:scale-[1.02]"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    立即开始 <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Provider Status */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">提供商状态</h2>
              <Link
                href="/settings/providers"
                className="text-sm text-primary hover:underline"
              >
                管理提供商
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">LLM 模型</div>
                    <div className="text-xs text-muted-foreground">对话 / 提示词润色</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {providers.filter((p: any) => p.llm_models?.length > 0).length} 个可用
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">图像模型</div>
                    <div className="text-xs text-muted-foreground">文生图 / 图生图</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {providers.filter((p: any) => p.image_models?.length > 0).length} 个可用
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <div className="font-medium">视频模型</div>
                    <div className="text-xs text-muted-foreground">文生视频 / 图生视频</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {providers.filter((p: any) => p.video_models?.length > 0).length} 个可用
                </div>
              </div>
            </div>
          </section>

          {/* Recent Assets */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">最近作品</h2>
              <Link href="/assets" className="text-sm text-primary hover:underline">
                查看全部
              </Link>
            </div>
            {imageAssets.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border/50 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>还没有生成作品</p>
                <p className="text-sm mt-1">从上方快速开始创作吧</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {imageAssets.slice(0, 6).map((asset: any) => (
                  <Link
                    key={asset.id}
                    href="/assets"
                    className="aspect-square rounded-xl overflow-hidden border border-border/50 group"
                  >
                    <img
                      src={asset.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
