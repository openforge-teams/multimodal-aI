'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { trpc } from '@/lib/trpc-client';
import {
  Image,
  Video,
  Search,
  Filter,
  Download,
  Trash2,
  Copy,
  Film,
  Grid3X3,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: imageAssets = [] } = trpc.asset.list.useQuery(
    { type: 'image', limit: 50 },
    { enabled: activeTab === 'all' || activeTab === 'image' },
  );

  const { data: videoAssets = [] } = trpc.asset.list.useQuery(
    { type: 'video', limit: 50 },
    { enabled: activeTab === 'all' || activeTab === 'video' },
  );

  const allAssets = [...imageAssets, ...videoAssets].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filteredAssets = allAssets.filter((asset: any) =>
    asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const tabs = [
    { id: 'all', label: '全部', count: allAssets.length },
    { id: 'image', label: '图片', count: imageAssets.length },
    { id: 'video', label: '视频', count: videoAssets.length },
  ];

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">资产库</h1>
              <p className="text-sm text-muted-foreground mt-1">
                管理你生成的所有图片和视频
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex p-1 rounded-lg bg-accent/30">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
                )}
              >
                {tab.label}
                <span className="ml-2 text-xs opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索提示词..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <button className="px-4 py-2.5 rounded-lg bg-accent/30 hover:bg-accent/50 text-sm font-medium flex items-center gap-2 transition-colors">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Image className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">暂无资产</p>
              <p className="text-sm mt-1">去创作工作台生成你的第一个作品吧</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="group relative rounded-xl overflow-hidden border border-border/50 bg-card"
                >
                  <div className={cn(asset.type === 'video' ? 'aspect-video' : 'aspect-square')}>
                    {asset.type === 'video' ? (
                      <video
                        src={asset.url}
                        poster={asset.thumbnail}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-md bg-black/60 text-white text-xs flex items-center gap-1">
                      {asset.type === 'video' ? (
                        <><Video className="w-3 h-3" /> 视频</>
                      ) : (
                        <><Image className="w-3 h-3" /> 图片</>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {asset.type === 'image' && (
                      <button className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80">
                        <Film className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md bg-destructive/80 text-white hover:bg-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Prompt */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-xs text-white/80 line-clamp-2">{asset.prompt || '无描述'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className={cn('w-20 h-20 rounded-lg overflow-hidden flex-shrink-0', asset.type === 'video' ? 'aspect-video' : 'aspect-square')}>
                    {asset.type === 'video' ? (
                      <video src={asset.url} poster={asset.thumbnail} className="w-full h-full object-cover" />
                    ) : (
                      <img src={asset.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{asset.prompt || '无描述'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{asset.type === 'video' ? '视频' : '图片'}</span>
                      <span>·</span>
                      <span>{asset.model}</span>
                      <span>·</span>
                      <span>{new Date(asset.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
