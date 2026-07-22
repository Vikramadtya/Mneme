import { v4 as uuidv4 } from "uuid";
import type { AITaskRequest, AITaskResponse, AIHardwareStatus } from "./types";

// Note: ?worker is Vite's syntax to import a file as a Web Worker
import AIWorker from "./worker?worker";

class AIClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      onProgress?: (p: number, s: string) => void;
    }
  >();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new AIWorker();
      this.worker.addEventListener("message", this.handleMessage.bind(this));
    }
    return this.worker;
  }

  private handleMessage(event: MessageEvent<AITaskResponse>) {
    const { id, success, data, error, progress, status } = event.data;
    const handlers = this.pendingRequests.get(id);

    if (handlers) {
      if (progress !== undefined && handlers.onProgress) {
        handlers.onProgress(progress, status || "");
        // If it's 100% and ready, we can resolve
        if (progress === 100 && status === "ready") {
          handlers.resolve(true);
          this.pendingRequests.delete(id);
        }
      } else {
        if (success) {
          handlers.resolve(data);
        } else {
          handlers.reject(new Error(error || "Unknown AI error"));
        }
        this.pendingRequests.delete(id);
      }
    }
  }

  private resolveModelName(model?: string): string | undefined {
    if (!model) return model;
    if (model === "Xenova/Qwen2.5-0.5B-Instruct")
      return "onnx-community/Qwen2.5-0.5B-Instruct";
    if (model === "Xenova/SmolLM-135M-Instruct")
      return "onnx-community/SmolLM2-135M-Instruct-ONNX";
    return model;
  }

  private sendRequest<T>(
    action: AITaskRequest["action"],
    payload?: any,
    model?: string,
    existingTags?: string[],
    onProgress?: (p: number, s: string) => void,
    options?: {
      temperature?: number;
      max_new_tokens?: number;
      repetition_penalty?: number;
    },
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.pendingRequests.set(id, { resolve, reject, onProgress });
      const resolvedModel = this.resolveModelName(model);
      this.getWorker().postMessage({
        id,
        action,
        payload,
        model: resolvedModel,
        existingTags,
        ...options,
      });
    });
  }

  public async checkHardware(): Promise<AIHardwareStatus> {
    return this.sendRequest<AIHardwareStatus>("CHECK_HARDWARE");
  }

  public async loadModel(
    model: string,
    onProgress: (progress: number, status: string) => void,
  ): Promise<void> {
    return this.sendRequest<void>(
      "LOAD_MODEL",
      undefined,
      model,
      undefined,
      onProgress,
    );
  }

  public async generateSummary(
    text: string,
    model: string,
    options?: {
      temperature?: number;
      max_new_tokens?: number;
      repetition_penalty?: number;
    },
    apiKeys?: { openAiKey?: string; anthropicKey?: string; geminiKey?: string },
  ): Promise<string> {
    if (!text || text.trim().length === 0) return "";

    if (model.startsWith("remote:")) {
      const prompt = `Summarize the following text concisely:\n\n${text}`;
      return this.handleRemoteAPI(prompt, model, apiKeys, options);
    }

    return this.sendRequest<string>(
      "GENERATE_SUMMARY",
      text,
      model,
      undefined,
      undefined,
      options,
    );
  }

  public async generateTags(
    text: string,
    model: string,
    existingTags: string[] = [],
    options?: {
      temperature?: number;
      max_new_tokens?: number;
      repetition_penalty?: number;
    },
    apiKeys?: { openAiKey?: string; anthropicKey?: string; geminiKey?: string },
  ): Promise<string[]> {
    if (!text || text.trim().length === 0) return [];

    if (model.startsWith("remote:")) {
      const prompt = `Given the following text, generate a comma-separated list of up to 5 relevant tags. ${existingTags.length > 0 ? `Consider these existing tags: ${existingTags.join(", ")}.` : ""} Only return the tags, separated by commas, nothing else.\n\nText: ${text}`;
      const response = await this.handleRemoteAPI(
        prompt,
        model,
        apiKeys,
        options,
      );
      return response
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
    }

    return this.sendRequest<string[]>(
      "GENERATE_TAGS",
      text,
      model,
      existingTags,
      undefined,
      options,
    );
  }

  private async checkAPIResponse(
    res: Response,
    provider: string,
  ): Promise<any> {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `${provider} API error: ${res.statusText} - ${JSON.stringify(err)}`,
      );
    }
    return await res.json();
  }

  private async handleRemoteAPI(
    prompt: string,
    modelId: string,
    apiKeys?: { openAiKey?: string; anthropicKey?: string; geminiKey?: string },
    options?: { temperature?: number; max_new_tokens?: number },
  ): Promise<string> {
    const model = modelId.replace("remote:", "");
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.max_new_tokens ?? 250;

    if (model.startsWith("gpt-") || model.startsWith("o1-")) {
      if (!apiKeys?.openAiKey)
        throw new Error("OpenAI API Key is required for this model.");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeys.openAiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      const data = await this.checkAPIResponse(res, "OpenAI");
      return data.choices[0].message.content.trim();
    }

    if (model.startsWith("claude-")) {
      if (!apiKeys?.anthropicKey)
        throw new Error("Anthropic API Key is required for this model.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeys.anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      const data = await this.checkAPIResponse(res, "Anthropic");
      return data.content[0].text.trim();
    }

    if (model.startsWith("gemini-")) {
      if (!apiKeys?.geminiKey)
        throw new Error("Gemini API Key is required for this model.");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys.geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        },
      );
      const data = await this.checkAPIResponse(res, "Gemini");
      return data.candidates[0].content.parts[0].text.trim();
    }

    throw new Error(`Unsupported remote model: ${model}`);
  }

  public async getModelsState(): Promise<import("./types").AIModelState[]> {
    return this.sendRequest<import("./types").AIModelState[]>(
      "GET_MODELS_STATE",
    );
  }

  public async unloadModels(model?: string): Promise<void> {
    return this.sendRequest<void>("UNLOAD_MODEL", undefined, model);
  }

  public async deleteModel(model?: string): Promise<void> {
    return this.sendRequest<void>("DELETE_MODEL", undefined, model);
  }

  // Gracefully terminate the worker if needed (e.g., to free memory)
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      // Reject any pending promises
      for (const [id, handlers] of this.pendingRequests.entries()) {
        handlers.reject(new Error("AI Worker was terminated"));
      }
      this.pendingRequests.clear();
    }
  }
}

// Export a singleton instance
export const aiClient = new AIClient();
