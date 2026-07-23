'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { trpc } from '@/lib/trpc-client';
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  Server,
  Key,
  ToggleLeft,
  ToggleRight,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const capabilitiesList = [
  { key: 'text_to_image', label: '文生图' },
  { key: 'image_to_image', label: '图生图' },
  { key: 'text_to_video', label: '文生视频' },
  { key: 'image_to_video', label: '图生视频' },
  { key: 'first_last_frame', label: '首尾帧' },
  { key: 'inpainting', label: '局部重绘' },
  { key: 'upscale', label: '高清放大' },
];

export default function ProvidersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: providers = [], isLoading } = trpc.provider.list.useQuery();
  const createProvider = trpc.provider.create.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate();
      setShowModal(false);
    },
  });
  const updateProvider = trpc.provider.update.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate();
      setEditingProvider(null);
      setShowModal(false);
    },
  });
  const deleteProvider = trpc.provider.delete.useMutation({
    onSuccess: () => utils.provider.list.invalidate(),
  });
  const testConnection = trpc.provider.testConnection.useMutation();

  function handleEdit(provider: any) {
    setEditingProvider(provider);
    setShowModal(true);
  }

  function handleTogglePrimary(providerId: string) {
    updateProvider.mutate({
      providerId,
      is_primary: true,
    });
  }

  function handleToggleEnabled(providerId: string, currentEnabled: boolean) {
    updateProvider.mutate({
      providerId,
      enabled: !currentEnabled,
    });
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">提供商管理</h1>
              <p className="text-sm text-muted-foreground mt-1">
                配置和管理你的 AI 提供商（LLM、图像、视频）
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProvider(null);
                setShowModal(true);
              }}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加提供商
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Server className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">还没有配置提供商</p>
              <p className="text-sm mt-1">点击"添加提供商"开始配置</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {providers.map((provider: any) => (
                <div
                  key={provider.id}
                  className={cn(
                    'p-5 rounded-xl border transition-colors',
                    provider.enabled
                      ? 'border-border/50 bg-card hover:bg-accent/20'
                      : 'border-border/30 bg-card/50 opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          provider.primary
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent/50 text-muted-foreground',
                        )}
                      >
                        <Server className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{provider.name}</h3>
                          {provider.primary && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              主提供商
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/50">
                            {provider.id}
                          </span>
                          <span>·</span>
                          <span>{provider.protocol}</span>
                          <span>·</span>
                          <span className="truncate max-w-xs">{provider.base_url}</span>
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          {provider.llm_models?.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                              LLM: {provider.llm_models.length} 个模型
                            </span>
                          )}
                          {provider.image_models?.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                              图像: {provider.image_models.length} 个模型
                            </span>
                          )}
                          {provider.video_models?.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-pink-500/10 text-pink-400">
                              视频: {provider.video_models.length} 个模型
                            </span>
                          )}
                          {provider.has_api_key ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 flex items-center gap-1">
                              <Key className="w-3 h-3" />
                              已配置
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
                              缺少 API Key
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testConnection.mutate({ providerId: provider.id })}
                        className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                        title="测试连接"
                      >
                        {testConnection.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleEnabled(provider.id, provider.enabled)}
                        className="p-2 rounded-lg hover:bg-accent/50"
                        title={provider.enabled ? '禁用' : '启用'}
                      >
                        {provider.enabled ? (
                          <ToggleRight className="w-5 h-5 text-primary" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {!provider.primary && (
                        <button
                          onClick={() => handleTogglePrimary(provider.id)}
                          className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-primary"
                          title="设为主提供商"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(provider)}
                        className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定删除此提供商？')) {
                            deleteProvider.mutate({ providerId: provider.id });
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ProviderModal
          provider={editingProvider}
          onClose={() => {
            setShowModal(false);
            setEditingProvider(null);
          }}
          onSubmit={(data) => {
            if (editingProvider) {
              updateProvider.mutate({
                providerId: editingProvider.id,
                ...data,
              });
            } else {
              createProvider.mutate(data as any);
            }
          }}
          isLoading={createProvider.isPending || updateProvider.isPending}
        />
      )}
    </AppLayout>
  );
}

function ProviderModal({
  provider,
  onClose,
  onSubmit,
  isLoading,
}: {
  provider: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    id: provider?.id || '',
    name: provider?.name || '',
    base_url: provider?.base_url || '',
    protocol: provider?.protocol || 'openai',
    api_key: '',
    llm_models: provider?.llm_models?.join(', ') || '',
    image_models: provider?.image_models?.join(', ') || '',
    video_models: provider?.video_models?.join(', ') || '',
    is_primary: provider?.primary || false,
    capabilities: provider?.capabilities || {},
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...formData,
      llm_models: formData.llm_models.split(',').map((s) => s.trim()).filter(Boolean),
      image_models: formData.image_models.split(',').map((s) => s.trim()).filter(Boolean),
      video_models: formData.video_models.split(',').map((s) => s.trim()).filter(Boolean),
    };
    onSubmit(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {provider ? '编辑提供商' : '添加提供商'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ID</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                disabled={!!provider}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm disabled:opacity-50"
                placeholder="my-provider"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">显示名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                placeholder="My Provider"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Base URL</label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              placeholder="https://api.example.com/v1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">协议</label>
              <select
                value={formData.protocol}
                onChange={(e) => setFormData({ ...formData, protocol: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                <option value="openai">OpenAI 兼容</option>
                <option value="apimart">Apimart</option>
                <option value="native">原生协议</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                placeholder={provider ? '留空不修改' : 'sk-...'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">LLM 模型（逗号分隔）</label>
            <input
              type="text"
              value={formData.llm_models}
              onChange={(e) => setFormData({ ...formData, llm_models: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              placeholder="gpt-4o, gpt-4o-mini"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">图像模型（逗号分隔）</label>
            <input
              type="text"
              value={formData.image_models}
              onChange={(e) => setFormData({ ...formData, image_models: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              placeholder="flux-2, sd-xl, kolors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">视频模型（逗号分隔）</label>
            <input
              type="text"
              value={formData.video_models}
              onChange={(e) => setFormData({ ...formData, video_models: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              placeholder="wan2.6, kling, seedance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">能力</label>
            <div className="flex flex-wrap gap-2">
              {capabilitiesList.map((cap) => (
                <button
                  key={cap.key}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      capabilities: {
                        ...formData.capabilities,
                        [cap.key]: !(formData.capabilities as any)[cap.key],
                      },
                    })
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    (formData.capabilities as any)[cap.key]
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80',
                  )}
                >
                  {(formData.capabilities as any)[cap.key] && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">设为主提供商</span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border hover:bg-accent/30 font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {provider ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
