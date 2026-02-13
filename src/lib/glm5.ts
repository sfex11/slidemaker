/**
 * GLM-5 API 클라이언트 설정
 * Z.ai API (OpenAI 호환)를 사용하여 슬라이드 콘텐츠 생성
 */

import OpenAI from "openai";

// GLM-5 API 설정
const GLM5_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
const GLM5_MODEL = "glm-5";

// API 클라이언트 싱글톤
let glm5Client: OpenAI | null = null;

/**
 * GLM-5 API 클라이언트 인스턴스를 반환합니다.
 * 환경변수 ZAI_API_KEY가 설정되지 않으면 에러를 발생시킵니다.
 */
export function getGLM5Client(): OpenAI {
  if (!glm5Client) {
    const apiKey = process.env.ZAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ZAI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
      );
    }

    glm5Client = new OpenAI({
      apiKey,
      baseURL: GLM5_BASE_URL,
    });
  }

  return glm5Client;
}

/**
 * GLM-5 모델 정보
 */
export const GLM5_CONFIG = {
  model: GLM5_MODEL,
  contextWindow: 204800, // 200K 토큰
  maxTokens: 131072, // 128K 토큰
} as const;

/**
 * 기본 생성 옵션 타입
 */
export interface GenerationOptions {
  model: string;
  temperature: number;
  max_tokens: number;
}

/**
 * 기본 생성 옵션
 */
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  model: GLM5_MODEL,
  temperature: 0.7,
  max_tokens: 8192,
};

/**
 * 채팅 완성 요청 타입
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * GLM-5 채팅 완성 요청
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  options?: Partial<GenerationOptions>
): Promise<string> {
  const client = getGLM5Client();

  const response = await client.chat.completions.create({
    ...DEFAULT_GENERATION_OPTIONS,
    ...options,
    messages,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("GLM-5 응답에서 콘텐츠를 찾을 수 없습니다.");
  }

  return content;
}

/**
 * 스트리밍 채팅 완성 요청
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  options?: Partial<GenerationOptions>
): AsyncGenerator<string, void, unknown> {
  const client = getGLM5Client();

  const stream = await client.chat.completions.create({
    ...DEFAULT_GENERATION_OPTIONS,
    ...options,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
