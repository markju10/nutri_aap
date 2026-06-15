import OpenAI from "openai";
import { ENV } from "./env";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!ENV.openaiApiKey) {
      throw new Error("OPENAI_API_KEY non configurata. Aggiungila nelle variabili d'ambiente Railway.");
    }
    _client = new OpenAI({ apiKey: ENV.openaiApiKey });
  }
  return _client;
}

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: string;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  model?: string;
  response_format?: ResponseFormat;
  responseFormat?: ResponseFormat;
  max_tokens?: number;
  maxTokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  toolChoice?: unknown;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// Normalizza i messaggi nel formato OpenAI
function normalizeMessages(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    const content = msg.content;

    if (typeof content === "string") {
      return { role: msg.role as "system" | "user" | "assistant", content };
    }

    if (Array.isArray(content)) {
      const parts = content.map((part) => {
        if (typeof part === "string") return { type: "text" as const, text: part };
        if (part.type === "text") return { type: "text" as const, text: part.text };
        if (part.type === "image_url") {
          return {
            type: "image_url" as const,
            image_url: { url: part.image_url.url, detail: part.image_url.detail ?? "auto" },
          };
        }
        return { type: "text" as const, text: JSON.stringify(part) };
      });
      return { role: msg.role as "system" | "user" | "assistant", content: parts } as OpenAI.Chat.ChatCompletionMessageParam;
    }

    return { role: msg.role as "system" | "user" | "assistant", content: JSON.stringify(content) };
  });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();
  const model = params.model ?? ENV.openaiModel;
  const messages = normalizeMessages(params.messages);
  const maxTokens = params.max_tokens ?? params.maxTokens;
  const responseFormat = params.response_format ?? params.responseFormat;

  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(responseFormat ? { response_format: responseFormat as OpenAI.ResponseFormatJSONSchema } : {}),
  };

  const response = await client.chat.completions.create(requestParams);

  return {
    id: response.id,
    created: response.created,
    model: response.model,
    choices: response.choices.map((c, i) => ({
      index: i,
      message: {
        role: (c.message.role ?? "assistant") as Role,
        content: c.message.content ?? "",
        tool_calls: c.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: (tc as { id: string; type: string; function: { name: string; arguments: string } }).function?.name ?? "",
            arguments: (tc as { id: string; type: string; function: { name: string; arguments: string } }).function?.arguments ?? "",
          },
        })),
      },
      finish_reason: c.finish_reason ?? null,
    })),
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
  };
}
