'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { trpc } from '@/lib/trpc-client';
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Download,
  RefreshCw,
  Film,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const aspectRatios = [
  { value: '1:1', label: '1:1', desc: '方形' },
  { value: '16:9', label: '16:9', desc: '横屏' },
  { value: '9:16', label: '9:16', desc: '竖屏' },
  { value: '3:4', label: '3:4', desc: '肖像' },
  { value: '4:3', label: '4:3', desc: '经典' },
];

const qualities = [
  { value: 'standard', label: '标准' },
  { value: 'hd', label: '高清' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('standard');
  const [numImages, setNumImages] = useState(4);
  const [seed, setSeed] = useState<number | ''>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const createTask = trpc.task.create.useMutation();
  const { data: providers = [] } = trpc.provider.list.useQuery();
  const { data: assets = [], refetch: refetchAssets } = trpc.asset.list.useQuery({
    type: 'image',
    limit: 20,
  });

  const imageProviders = providers.filter((p: any) => p.image_models?.length > 0 && p.enabled);
  const [selectedProvider, setSelectedProvider] = useState(imageProviders[0]?.id || '');
  const [selectedModel, setSelectedModel] = useState(
    imageProviders[0]?.image_models?.[0] || '',
  );

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!selectedProvider || !selectedModel) {
      alert('请先配置图像生成提供商');
      return;
    }

    const request: any = {
      prompt: prompt.trim(),
      aspect_ratio: aspectRatio,
      quality,
      num_images: numImages,
    };

    if (negativePrompt.trim()) {
      request.negative_prompt = negativePrompt.trim();
    }
    if (seed !== '') {
      request.seed = Number(seed);
    }

    createTask.mutate(
      {
        provider: selectedProvider,
        model: selectedModel,
        modality: 'image',
        requestType: 'text_to_image',
        request,
      },
      {
        onSuccess: () => {
          setTimeout(() => refetchAssets(), 2000);
        },
      },
    );
  }

  async function handleEnhancePrompt() {
    if (!prompt.trim()) return;
    setEnhancing(true);

    try {
      const response = await fetch('/webapi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                '你是一个专业的 AI 图像提示词优化师。请将用户的简短描述扩展为详细、专业的图像生成提示词。使用公式：主体 + 场景 + 风格 + 画质 + 镜头。只返回优化后的提示词，不要解释。',
            },
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          setPrompt(data.content);
        }
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <AppLayout>
      <div className="h-full flex">
        {/* Left Panel */}
        <div className="w-96 border-r border-border/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              文生图
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Provider & Model */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">模型</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  const p = imageProviders.find((x: any) => x.id === e.target.value);
                  setSelectedModel(p?.image_models?.[0] || '');
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                {imageProviders.length === 0 && (
                  <option value="">请先配置图像提供商</option>
                )}
                {imageProviders.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                {selectedProvider &&
                  imageProviders
                    .find((p: any) => p.id === selectedProvider)
                    ?.image_models?.map((m: string) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
              </select>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">提示词</label>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || !prompt.trim()}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {enhancing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  智能润色
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的图像..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {prompt.length} 字符
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">画面比例</label>
              <div className="grid grid-cols-5 gap-2">
                {aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value)}
                    className={cn(
                      'p-2 rounded-lg border text-xs font-medium transition-colors',
                      aspectRatio === ar.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">画质</label>
              <div className="grid grid-cols-4 gap-2">
                {qualities.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuality(q.value)}
                    className={cn(
                      'py-2 rounded-lg border text-xs font-medium transition-colors',
                      quality === q.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of images */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                生成数量: {numImages}
              </label>
              <input
                type="range"
                min={1}
                max={9}
                value={numImages}
                onChange={(e) => setNumImages(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Advanced */}
            <div className="border-t border-border/50 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                高级参数
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">负面提示词</label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="描述你不想出现的内容..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">种子 (Seed)</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) =>
                        setSeed(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="留空随机"
                      className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-border/50">
            <button
              onClick={handleGenerate}
              disabled={createTask.isPending || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  立即生成
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-medium">生成结果</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchAssets()}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {assets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">还没有生成的图像</p>
                <p className="text-sm mt-1">在左侧输入提示词开始创作</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assets.map((asset: any) => (
                  <div
                    key={asset.id}
                    className="group relative rounded-xl overflow-hidden border border-border/50 bg-card aspect-square"
                  >
                    <img
                      src={asset.url}
                      alt={asset.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-xs text-white/80 line-clamp-2 mb-2">
                          {asset.prompt}
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="flex-1 py-1.5 rounded bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </button>
                          <button className="py-1.5 px-3 rounded bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center gap-1">
                            <Film className="w-3.5 h-3.5" />
                            动起来
                          </button>
                          <button className="py-1.5 px-3 rounded bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center gap-1">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
