// src/ai/types.ts

export type AIAction =
  | "LOAD_MODEL"
  | "CHECK_HARDWARE"
  | "GENERATE_SUMMARY"
  | "GENERATE_TAGS"
  | "UNLOAD_MODEL"
  | "DELETE_MODEL"
  | "GET_MODELS_STATE";

export interface AITaskRequest {
  id: string;
  action: AIAction;
  payload?: any;
  model?: string;
  existingTags?: string[];
  temperature?: number;
  max_new_tokens?: number;
  repetition_penalty?: number;
}

export interface AIModelState {
  id: string; // e.g. "Xenova/Qwen1.5-0.5B"
  isLoaded: boolean;
  isCached: boolean;
}

export interface AITaskResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  progress?: number; // 0 to 100 for model downloading
  status?: string; // Status message for downloading
}

export interface AIHardwareStatus {
  device: "webgpu" | "wasm";
  modelLoaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
}
