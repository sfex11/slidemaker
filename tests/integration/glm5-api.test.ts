/**
 * GLM-5 API 연결 통합 테스트
 * 실제 Z.ai API를 호출하여 연결 및 응답을 검증합니다.
 *
 * Note: 외부 네트워크 접근이 필요합니다. 네트워크가 차단된 환경에서는 스킵됩니다.
 */

import { describe, it, expect, beforeAll } from "vitest";

// 환경변수 직접 설정 (테스트용)
const ZAI_API_KEY = process.env.ZAI_API_KEY || "2c73023a16654857a6f49da0ff99a358.tJSWiUMF0wWsIAMP";

/**
 * 네트워크 접근 가능 여부를 확인합니다.
 */
async function isNetworkAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch("https://api.z.ai", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

describe("GLM-5 API 연결 테스트", () => {
  let OpenAI: typeof import("openai").default;
  let networkAvailable = false;

  beforeAll(async () => {
    const mod = await import("openai");
    OpenAI = mod.default;
    networkAvailable = await isNetworkAvailable();
    if (!networkAvailable) {
      console.log("⚠️  외부 네트워크 접근 불가 - GLM-5 API 테스트를 스킵합니다.");
    }
  });

  it("Z.ai API에 연결할 수 있다", async () => {
    if (!networkAvailable) {
      console.log("  → 네트워크 없음, 스킵");
      return;
    }

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: "https://api.z.ai/api/coding/paas/v4",
      dangerouslyAllowBrowser: true,
    });

    const response = await client.chat.completions.create({
      model: "glm-5",
      messages: [
        { role: "user", content: "Say hello in Korean. Reply with just one word." },
      ],
      max_tokens: 50,
      temperature: 0.1,
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message.content).toBeTruthy();
    console.log("GLM-5 응답:", response.choices[0].message.content);
  }, 30000);

  it("슬라이드 JSON 형식으로 응답을 생성할 수 있다", async () => {
    if (!networkAvailable) {
      console.log("  → 네트워크 없음, 스킵");
      return;
    }

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: "https://api.z.ai/api/coding/paas/v4",
      dangerouslyAllowBrowser: true,
    });

    const response = await client.chat.completions.create({
      model: "glm-5",
      messages: [
        {
          role: "system",
          content: "You generate JSON slide data. Respond with ONLY valid JSON, no markdown code blocks.",
        },
        {
          role: "user",
          content: `Generate a minimal presentation about "Hello World" with exactly 2 slides.
Response format:
{
  "title": "Presentation Title",
  "slides": [
    { "id": "slide-1", "type": "title", "title": "...", "content": {} }
  ]
}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    expect(content).toBeTruthy();

    // JSON 파싱 시도
    let parsed: Record<string, unknown>;
    try {
      let jsonStr = content!;
      const jsonMatch = content!.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.log("Raw response:", content);
      throw new Error(`JSON 파싱 실패: ${(e as Error).message}`);
    }

    expect(parsed).toHaveProperty("title");
    expect(parsed).toHaveProperty("slides");
    expect(Array.isArray(parsed.slides)).toBe(true);
    console.log("생성된 슬라이드 수:", (parsed.slides as unknown[]).length);
    console.log("프레젠테이션 제목:", parsed.title);
  }, 60000);

  it("GLM-5 클라이언트 설정이 올바르다", () => {
    // 네트워크 없이도 실행 가능한 검증
    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: "https://api.z.ai/api/coding/paas/v4",
      dangerouslyAllowBrowser: true,
    });

    expect(client).toBeDefined();
    expect(ZAI_API_KEY).toBeTruthy();
    expect(ZAI_API_KEY.length).toBeGreaterThan(10);
  });
});
