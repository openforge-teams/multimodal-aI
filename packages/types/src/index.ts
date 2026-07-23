// ============ 提供商类型 ============

export type ProviderProtocol = 'openai' | 'apimart' | 'native';

export interface ProviderCapabilities {
  text_to_image?: boolean;
  image_to_image?: boolean;
  text_to_video?: boolean;
  image_to_video?: boolean;
  first_last_frame?: boolean;
  multi_reference?: number;
  upscale?: boolean;
  inpainting?: boolean;
  outpainting?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  protocol: ProviderProtocol;
  enabled: boolean;
  primary: boolean;
  llm_models: string[];
  image_models: string[];
  video_models: string[];
  capabilities: ProviderCapabilities;
  rate_limit_rpm?: number;
}

export interface ProviderConfig extends Provider {
  api_key?: string;
}

// ============ 任务状态机 ============

export type TaskModality = 'llm' | 'image' | 'video';

export type TaskStatus =
  | 'created'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export interface TaskError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface TaskMetadata {
  credits_cost: number;
  started_at?: string;
  finished_at?: string;
  provider_raw?: unknown;
}

export interface TaskHandle {
  task_id: string;
  provider: string;
  model: string;
  modality: TaskModality;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata: TaskMetadata;
  error?: TaskError;
}

// ============ LLM 类型 ============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Array<{ type: 'function'; function: FunctionDefinition }>;
  response_format?: { type: 'text' | 'json_object' };
  vendor_params?: Record<string, unknown>;
}

export interface ChatChunk {
  delta?: string;
  content?: string;
  role?: string;
  finish_reason?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

export interface ChatCompletion {
  id: string;
  content: string;
  role: string;
  finish_reason?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface FunctionCallResult {
  name: string;
  arguments: Record<string, unknown>;
}

// ============ 图像生成类型 ============

export type AspectRatio = '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
export type ImageQuality = 'standard' | 'hd' | '2k' | '4k';

export interface TextToImageRequest {
  model: string;
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: AspectRatio;
  quality?: ImageQuality;
  num_images?: number;
  seed?: number;
  style_preset?: string;
  vendor_params?: Record<string, unknown>;
}

export interface ImageToImageRequest {
  model: string;
  init_image: string;
  prompt: string;
  negative_prompt?: string;
  strength?: number;
  aspect_ratio?: AspectRatio;
  quality?: ImageQuality;
  num_images?: number;
  seed?: number;
  reference_images?: string[];
  vendor_params?: Record<string, unknown>;
}

export interface InpaintingRequest {
  model: string;
  image: string;
  mask: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  vendor_params?: Record<string, unknown>;
}

export interface UpscaleRequest {
  model: string;
  image: string;
  scale?: number;
  vendor_params?: Record<string, unknown>;
}

export type ImageRequest =
  | ({ type: 'text_to_image' } & TextToImageRequest)
  | ({ type: 'image_to_image' } & ImageToImageRequest)
  | ({ type: 'inpainting' } & InpaintingRequest)
  | ({ type: 'upscale' } & UpscaleRequest);

export interface ImageOutput {
  images: Array<{
    url: string;
    seed?: number;
    width?: number;
    height?: number;
  }>;
}

// ============ 视频生成类型 ============

export type VideoResolution = '480p' | '720p' | '1080p';
export type CameraMovement = 'pan' | 'zoom_in' | 'zoom_out' | 'orbit' | 'static';

export interface ShotDescription {
  description: string;
  duration?: number;
  camera_movement?: CameraMovement;
  reference_image?: string;
}

export interface TextToVideoRequest {
  model: string;
  prompt: string;
  duration?: number;
  resolution?: VideoResolution;
  aspect_ratio?: AspectRatio;
  camera_movement?: CameraMovement;
  audio?: {
    mode: 'auto' | 'none' | 'custom';
    reference_audio_url?: string;
  };
  shots?: ShotDescription[];
  seed?: number;
  vendor_params?: Record<string, unknown>;
}

export interface ImageToVideoRequest {
  model: string;
  image: string;
  prompt?: string;
  duration?: number;
  resolution?: VideoResolution;
  aspect_ratio?: AspectRatio;
  camera_movement?: CameraMovement;
  motion_strength?: number;
  seed?: number;
  vendor_params?: Record<string, unknown>;
}

export interface FirstLastFrameRequest {
  model: string;
  first_frame: string;
  last_frame: string;
  prompt?: string;
  duration?: number;
  resolution?: VideoResolution;
  seed?: number;
  vendor_params?: Record<string, unknown>;
}

export type VideoRequest =
  | ({ type: 'text_to_video' } & TextToVideoRequest)
  | ({ type: 'image_to_video' } & ImageToVideoRequest)
  | ({ type: 'first_last_frame' } & FirstLastFrameRequest);

export interface VideoOutput {
  videos: Array<{
    url: string;
    thumbnail_url?: string;
    duration?: number;
    width?: number;
    height?: number;
  }>;
}

// ============ 创意 Brief ============

export interface CreativeBrief {
  scene_description: string;
  visual_style: string;
  camera_movement: string;
  lighting: string;
  negative_prompt: string;
  duration: number;
  aspect_ratio: AspectRatio;
  key_frames?: {
    first?: string;
    last?: string;
  };
}

// ============ 资产类型 ============

export type AssetType = 'image' | 'video';

export interface Asset {
  id: string;
  type: AssetType;
  url: string;
  thumbnail?: string;
  parent_id?: string;
  task_id: string;
  provider: string;
  model: string;
  prompt: string;
  params: Record<string, unknown>;
  seed?: number;
  credits_cost: number;
  created_at: string;
  tags: string[];
  root_asset_id?: string;
  version: number;
}

// ============ 计费类型 ============

export interface ModelPricing {
  provider: string;
  model: string;
  modality: TaskModality;
  pricing_type: 'fixed' | 'tiered' | 'lookup';
  unit_cost: number;
  tiers?: Array<{
    condition: {
      resolution?: string;
      duration?: number;
      quality?: string;
    };
    multiplier: number;
  }>;
}

// ============ 工作流类型 ============

export interface WorkflowNode {
  id: string;
  type: 'llm' | 'image' | 'video' | 'input' | 'output' | 'condition';
  name: string;
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
