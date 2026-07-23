'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { trpc } from '@/lib/trpc-client';
import {
  Sparkles,
  Video,
  Upload,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const durations = [2, 3, 5, 8, 10, 15];
const resolutions = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
];
const cameraMovements = [
  { value: 'static', label: '静止' },
  { value: 'pan', label: '平移' },
  { value: 'zoom_in', label: '推近' },
  { value: 'zoom_out', label: '拉远' },
  { value: 'orbit', label: '环绕' },
];

export default function VideoPage() {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [initImage, setInitImage] = useState('');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [cameraMovement, setCameraMovement] = useState('static');
  const [motionStrength, setMotionStrength] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createTask = trpc.task.create.useMutation();
  const { data: providers = [] } = trpc.provider.list.useQuery();
  const { data: assets = [], refetch: refetchAssets } = trpc.asset.list.useQuery({
    type: 'video',
    limit: 20,
  });

  const videoProviders = providers.filter((p: any) => p.video_models?.length > 0 && p.enabled);
  const [selectedProvider, setSelectedProvider] = useState(videoProviders[0]?.id || '');
  const [selectedModel, setSelectedModel] = useState(
    videoProviders[0]?.video_models?.[0] || '',
  );

  async function handleGenerate() {
    if (!prompt.trim() && mode === 'text') return;
    if (mode === 'image' && !initImage) return;
    if (!selectedProvider || !selectedModel) {
      alert('请先配置视频生成提供商');
      return;
    }

    const request: any = {
      prompt: prompt.trim(),
      duration,
      resolution,
      camera_movement: cameraMovement,
      motion_strength: motionStrength / 100,
    };

    if (mode === 'image') {
      request.image = initImage;
    }

    createTask.mutate(
      {
        provider: selectedProvider,
        model: selectedModel,
        modality: 'video',
        requestType: mode === 'text' ? 'text_to_video' : 'image_to_video',
        request,
      },
      {
        onSuccess: () => {
          setTimeout(() => refetchAssets(), 5000);
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex">
        {/* Left Panel */}
        <div className="w-96 border-r border-border/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              视频生成
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Mode Toggle */}
            <div className="flex p-1 rounded-lg bg-accent/30">
              <button
                onClick={() => setMode('text')}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                文生视频
              </button>
              <button
                onClick={() => setMode('image')}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'image' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                图生视频
              </button>
            </div>

            {/* Provider & Model */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">模型</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  const p = videoProviders.find((x: any) => x.id === e.target.value);
                  setSelectedModel(p?.video_models?.[0] || '');
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                {videoProviders.length === 0 && (
                  <option value="">请先配置视频提供商</option>
                )}
                {videoProviders.map((p: any) => (
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
                  videoProviders
                    .find((p: any) => p.id === selectedProvider)
                    ?.video_models?.map((m: string) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
              </select>
            </div>

            {/* Image Upload (for image mode) */}
            {mode === 'image' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">起始图片</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  {initImage ? (
                    <img src={initImage} alt="" className="max-h-32 mx-auto rounded-lg" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">点击或拖拽上传图片</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">动作描述</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'text' ? '描述你想要生成的视频场景...' : '描述画面中的动作和运镜...'}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">时长</label>
              <div className="grid grid-cols-6 gap-2">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'py-2 rounded-lg border text-sm font-medium transition-colors',
                      duration === d
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">分辨率</label>
              <div className="grid grid-cols-3 gap-2">
                {resolutions.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={cn(
                      'py-2 rounded-lg border text-sm font-medium transition-colors',
                      resolution === r.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Movement */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">运镜方式</label>
              <div className="grid grid-cols-5 gap-2">
                {cameraMovements.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCameraMovement(c.value)}
                    className={cn(
                      'py-2 rounded-lg border text-xs font-medium transition-colors',
                      cameraMovement === c.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
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
                    <label className="block text-sm font-medium">
                      运动强度: {motionStrength}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={motionStrength}
                      onChange={(e) => setMotionStrength(Number(e.target.value))}
                      className="w-full"
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
              disabled={createTask.isPending || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !initImage)}
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
                  生成视频
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-medium">生成结果</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {assets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Video className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">还没有生成的视频</p>
                <p className="text-sm mt-1">在左侧配置参数开始创作</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assets.map((asset: any) => (
                  <div
                    key={asset.id}
                    className="group relative rounded-xl overflow-hidden border border-border/50 bg-card aspect-video"
                  >
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      poster={asset.thumbnail}
                      controls
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white/80 line-clamp-1">
                        {asset.prompt || '视频'}
                      </p>
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
