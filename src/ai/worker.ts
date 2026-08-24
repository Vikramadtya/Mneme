/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";
import type { AITaskRequest, AITaskResponse } from "./types";

// Configure transformers.js environment
env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

// Manage multiple active models
class PipelineManager {
  static instances = new Map<string, any>();
  static isWebGPU = false;

  static async getInstance(model: string, progress_callback?: any) {
    if (!this.instances.has(model)) {
      // Unload all other models to prevent std::bad_alloc (Out of Memory)
      await this.unloadAll();

      try {
        // Infer task based on model name
        const task =
          model.includes("T5") || model.includes("t5")
            ? "text2text-generation"
            : "text-generation";

        // Try to load with WebGPU acceleration
        const pipe = await pipeline(task, model, {
          device: "webgpu",
          dtype: "q8",
          progress_callback,
        });
        this.instances.set(model, pipe);
        this.isWebGPU = true;
      } catch (err) {
        console.warn(
          `WebGPU not supported or failed to load for ${model}. Falling back to WASM (CPU).`,
          err,
        );
        // Fallback to WASM
        const task =
          model.includes("T5") || model.includes("t5")
            ? "text2text-generation"
            : "text-generation";
        const pipe = await pipeline(task, model, {
          device: "wasm",
          dtype: "q8",
          progress_callback,
        });
        this.instances.set(model, pipe);
        this.isWebGPU = false;
      }
    }
    return this.instances.get(model);
  }

  static async unloadAll() {
    for (const [model, pipe] of this.instances.entries()) {
      if (typeof pipe.dispose === "function") {
        await pipe.dispose();
      }
    }
    this.instances.clear();
  }

  static async unloadModel(model: string) {
    if (this.instances.has(model)) {
      const pipe = this.instances.get(model);
      if (typeof pipe.dispose === "function") {
        await pipe.dispose();
      }
      this.instances.delete(model);
    }
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event: MessageEvent<AITaskRequest>) => {
  const request = event.data;

  try {
    switch (request.action) {
      case "CHECK_HARDWARE": {
        const defaultModel =
          request.model || "onnx-community/SmolLM2-135M-Instruct-ONNX";
        const pipe = await PipelineManager.getInstance(defaultModel);
        self.postMessage({
          id: request.id,
          success: true,
          data: {
            device: PipelineManager.isWebGPU ? "webgpu" : "wasm",
            modelLoaded: true,
          },
        } as AITaskResponse);
        break;
      }

      case "LOAD_MODEL": {
        const model =
          request.model || "onnx-community/SmolLM2-135M-Instruct-ONNX";
        await PipelineManager.getInstance(model, (x: any) => {
          self.postMessage({
            id: request.id,
            success: true,
            status: x.status,
            progress:
              x.progress !== undefined
                ? x.progress
                : (x.loaded / x.total) * 100 || 0,
          } as AITaskResponse);
        });
        self.postMessage({
          id: request.id,
          success: true,
          status: "ready",
          progress: 100,
        } as AITaskResponse);
        break;
      }

      case "GENERATE_SUMMARY": {
        const model =
          request.model || "onnx-community/SmolLM2-135M-Instruct-ONNX";
        const pipe = await PipelineManager.getInstance(model);

        let prompt = `Summarize the following text comprehensively:\n\n${request.payload}`;
        const isInstruct = model.includes("Qwen") || model.includes("SmolLM");

        if (isInstruct) {
          prompt = `<|im_start|>system\nYou are an expert summarizer. Provide a concise, comprehensive summary of the user's text.<|im_end|>\n<|im_start|>user\nText: ${request.payload}\n<|im_end|>\n<|im_start|>assistant\n`;
        }

        const result = await pipe(prompt, {
          max_new_tokens: request.max_new_tokens ?? 512,
          temperature: request.temperature ?? 0.5,
          repetition_penalty: request.repetition_penalty ?? 1.0,
          do_sample: (request.temperature ?? 0.5) > 0,
          ...(isInstruct && { return_full_text: false }),
        });

        let generated = result[0].generated_text;
        // Clean up output if the model ignored return_full_text
        if (isInstruct && generated.includes("<|im_start|>assistant\n")) {
          generated = generated.split("<|im_start|>assistant\n").pop();
        }

        self.postMessage({
          id: request.id,
          success: true,
          data: generated.trim(),
        } as AITaskResponse);
        break;
      }

      case "GENERATE_TAGS": {
        const model =
          request.model || "onnx-community/SmolLM2-135M-Instruct-ONNX";
        const pipe = await PipelineManager.getInstance(model);

        const existingContext = request.existingTags?.length
          ? `Prefer reusing these existing tags if relevant: ${request.existingTags.slice(0, 40).join(", ")}\n\n`
          : "";

        // Truncate payload to avoid context window explosion for local models
        const truncatedPayload = request.payload.substring(0, 2500);

        const isInstruct = model.includes("Qwen") || model.includes("SmolLM");

        let prompt = `Extract exactly 1 to 5 concise tags (lowercase, 1-2 words each) for the text. Output ONLY a comma-separated list. No explanations. ${existingContext}\nText: ${truncatedPayload}`;

        if (isInstruct) {
          prompt = `<|im_start|>system\nYou are an expert metadata tagger. Extract up to 5 concise tags (lowercase, 1-2 words) for the text. Output ONLY a comma-separated list. No explanations, no numbering, no prefix. ${existingContext}<|im_end|>\n<|im_start|>user\nText: ${truncatedPayload}\n<|im_end|>\n<|im_start|>assistant\n`;
        }

        const result = await pipe(prompt, {
          max_new_tokens: request.max_new_tokens ?? 30,
          temperature: request.temperature ?? 0.1,
          repetition_penalty: request.repetition_penalty ?? 1.0,
          do_sample: (request.temperature ?? 0.1) > 0,
          ...(isInstruct && { return_full_text: false }),
        });

        const rawTags = result[0].generated_text || "";
        // Strict parser:
        // 1. split by comma or newline
        // 2. clean up whitespace and bad chars
        // 3. reject any tag longer than 25 chars or containing more than 3 words
        let cleanedTags = rawTags.replace(
          /^\s*(here are the tags:|tags:|tags\s*\n)/i,
          "",
        );
        const tags = cleanedTags
          .split(/[,|\n]/)
          .map((t: string) =>
            t
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9- ]/g, ""),
          )
          .filter(
            (t: string) =>
              t.length > 0 && t.length <= 25 && t.split(" ").length <= 3,
          );

        self.postMessage({
          id: request.id,
          success: true,
          data: Array.from(new Set(tags)).slice(0, 3), // Ensure max 3 unique tags
        } as AITaskResponse);
        break;
      }

      case "UNLOAD_MODEL": {
        if (request.model) {
          await PipelineManager.unloadModel(request.model);
        } else {
          await PipelineManager.unloadAll();
        }
        self.postMessage({
          id: request.id,
          success: true,
        } as AITaskResponse);
        break;
      }

      case "DELETE_MODEL": {
        if (request.model) {
          await PipelineManager.unloadModel(request.model);
          try {
            const cache = await caches.open("transformers-cache");
            const keys = await cache.keys();
            for (const req of keys) {
              if (req.url.includes(request.model)) {
                await cache.delete(req);
              }
            }
          } catch (e) {}
        } else {
          await PipelineManager.unloadAll();
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
        self.postMessage({
          id: request.id,
          success: true,
        } as AITaskResponse);
        break;
      }

      case "GET_MODELS_STATE": {
        const supportedModels = ["onnx-community/SmolLM2-135M-Instruct-ONNX"];

        // 1. Check RAM
        const loadedModels = new Set(PipelineManager.instances.keys());

        // 2. Check Disk
        const cachedModels = new Set<string>();
        try {
          const cache = await caches.open("transformers-cache");
          const keys = await cache.keys();
          for (const req of keys) {
            for (const model of supportedModels) {
              if (req.url.includes(model)) {
                cachedModels.add(model);
              }
            }
          }
        } catch (e) {}

        const stateData = supportedModels.map((model) => ({
          id: model,
          isLoaded: loadedModels.has(model),
          isCached: cachedModels.has(model),
        }));

        self.postMessage({
          id: request.id,
          success: true,
          data: stateData,
        } as AITaskResponse);
        break;
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  } catch (error: any) {
    self.postMessage({
      id: request.id,
      success: false,
      error: error.message,
    } as AITaskResponse);
  }
});
