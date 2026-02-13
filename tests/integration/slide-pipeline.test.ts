/**
 * 마크다운 파서 + 슬라이드 매퍼 + 슬라이드 생성기 통합 테스트
 * 마크다운 → 토큰 → 매핑 → 슬라이드 Props 전체 파이프라인을 검증합니다.
 */

import { describe, it, expect } from "vitest";
import { parseMarkdown, stripMarkdownFormatting, extractLinks } from "../../src/lib/markdown/parser";
import { mapTokensToSlides, getMappingStatistics, analyzeContentPattern } from "../../src/lib/markdown/slide-mapper";
import { createSlidesFromMappings, generateSlidesFromMarkdown, getSlidePreviewText } from "../../src/lib/slide-generator";

describe("마크다운 파서 테스트", () => {
  it("H1 제목을 파싱한다", () => {
    const result = parseMarkdown("# 프레젠테이션 제목");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("heading1");
    expect((result.tokens[0] as { content: string }).content).toBe("프레젠테이션 제목");
  });

  it("여러 레벨의 제목을 파싱한다", () => {
    const md = `# H1
## H2
### H3`;
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(3);
    expect(result.tokens[0].type).toBe("heading1");
    expect(result.tokens[1].type).toBe("heading2");
    expect(result.tokens[2].type).toBe("heading3");
  });

  it("순서 없는 리스트를 파싱한다", () => {
    const md = `- 항목 1
- 항목 2
- 항목 3`;
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("unordered_list");
    const list = result.tokens[0] as { items: Array<{ content: string }> };
    expect(list.items).toHaveLength(3);
    expect(list.items[0].content).toBe("항목 1");
  });

  it("순서 있는 리스트를 파싱한다", () => {
    const md = `1. 첫 번째
2. 두 번째
3. 세 번째`;
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("ordered_list");
    const list = result.tokens[0] as { items: Array<{ content: string; index: number }> };
    expect(list.items).toHaveLength(3);
    expect(list.items[0].index).toBe(1);
  });

  it("인용문을 파싱한다", () => {
    const md = `> 인생은 짧고 예술은 길다 — 히포크라테스`;
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("blockquote");
    const quote = result.tokens[0] as { content: string; author?: string };
    expect(quote.author).toBe("히포크라테스");
  });

  it("테이블을 파싱한다", () => {
    // 파서는 구분선에 공백 없는 형식만 지원
    const md = `| 이름 | 나이 | 직업 |
|---|---|---|
| 김철수 | 30 | 개발자 |
| 이영희 | 25 | 디자이너 |`;
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("table");
    const table = result.tokens[0] as { headers: string[]; rows: string[][] };
    expect(table.headers.length).toBeGreaterThanOrEqual(3);
    expect(table.rows).toHaveLength(2);
  });

  it("코드 블록을 파싱한다", () => {
    const md = "```typescript\nconst x = 1;\n```";
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("code_block");
    const code = result.tokens[0] as { code: string; language?: string };
    expect(code.language).toBe("typescript");
    expect(code.code).toBe("const x = 1;");
  });

  it("단락을 파싱한다", () => {
    const md = "이것은 일반 텍스트 단락입니다.";
    const result = parseMarkdown(md);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("paragraph");
  });

  it("수평선을 파싱한다", () => {
    const result = parseMarkdown("---");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].type).toBe("horizontal_rule");
  });

  it("복합 마크다운 문서를 파싱한다", () => {
    const md = `# 프레젠테이션 제목

## 소개
안녕하세요, 반갑습니다.

## 주요 기능
- 기능 A: 빠른 처리
- 기능 B: 안정성
- 기능 C: 확장성

## 비교
| 항목 | A | B |
|---|---|---|
| 속도 | 빠름 | 보통 |

> 기술은 세상을 바꾼다 — 스티브 잡스

1. 계획 수립
2. 개발 시작
3. 테스트 진행
4. 배포 완료`;
    const result = parseMarkdown(md);
    expect(result.tokens.length).toBeGreaterThanOrEqual(7);

    const types = result.tokens.map((t) => t.type);
    expect(types).toContain("heading1");
    expect(types).toContain("heading2");
    expect(types).toContain("paragraph");
    expect(types).toContain("unordered_list");
    expect(types).toContain("table");
    expect(types).toContain("blockquote");
    expect(types).toContain("ordered_list");
  });
});

describe("마크다운 유틸리티 테스트", () => {
  it("stripMarkdownFormatting이 올바르게 동작한다", () => {
    expect(stripMarkdownFormatting("**bold**")).toBe("bold");
    expect(stripMarkdownFormatting("*italic*")).toBe("italic");
    expect(stripMarkdownFormatting("`code`")).toBe("code");
    expect(stripMarkdownFormatting("[link](https://example.com)")).toBe("link");
  });

  it("extractLinks가 링크를 올바르게 추출한다", () => {
    const text = "[Google](https://google.com) and [GitHub](https://github.com)";
    const links = extractLinks(text);
    expect(links).toHaveLength(2);
    expect(links[0].text).toBe("Google");
    expect(links[1].url).toBe("https://github.com");
  });
});

describe("슬라이드 매퍼 테스트", () => {
  it("H1만 있으면 제목 슬라이드로 매핑된다", () => {
    const result = parseMarkdown("# 프레젠테이션 제목");
    const mappings = mapTokensToSlides(result.tokens);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].type).toBe("title");
    expect(mappings[0].confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("3개 항목 리스트는 카드 그리드로 매핑된다", () => {
    const md = `- **기능 A**: 설명
- **기능 B**: 설명
- **기능 C**: 설명`;
    const result = parseMarkdown(md);
    const mappings = mapTokensToSlides(result.tokens);
    expect(mappings[0].type).toBe("card-grid");
  });

  it("순서 있는 리스트 3개 이상은 타임라인으로 매핑된다", () => {
    const md = `1. 첫 번째 단계
2. 두 번째 단계
3. 세 번째 단계`;
    const result = parseMarkdown(md);
    const mappings = mapTokensToSlides(result.tokens);
    expect(mappings[0].type).toBe("timeline");
  });

  it("인용문은 인용문 슬라이드로 매핑된다", () => {
    const md = `> 인생은 짧고 예술은 길다. 의료는 더 길다. — 히포크라테스`;
    const result = parseMarkdown(md);
    const mappings = mapTokensToSlides(result.tokens);
    expect(mappings[0].type).toBe("quote");
  });

  it("테이블은 테이블 슬라이드로 매핑된다", () => {
    const md = `| 이름 | 나이 |
|---|---|
| A | 20 |`;
    const result = parseMarkdown(md);
    const mappings = mapTokensToSlides(result.tokens);
    expect(mappings[0].type).toBe("table");
  });

  it("콘텐츠 패턴 분석이 올바르게 동작한다", () => {
    const md = `# 제목

- 항목 1
- 항목 2

> 인용문

| A | B |
|---|---|
| 1 | 2 |`;
    const result = parseMarkdown(md);
    const pattern = analyzeContentPattern(result.tokens);
    expect(pattern.hasTitle).toBe(true);
    expect(pattern.titleLevel).toBe(1);
    expect(pattern.listCount).toBe(1);
    expect(pattern.hasBlockquote).toBe(true);
    expect(pattern.hasTable).toBe(true);
  });

  it("매핑 통계가 올바르게 계산된다", () => {
    const md = `# 제목

- 항목 1
- 항목 2
- 항목 3

> 인용문이 여기에 있습니다.`;
    const result = parseMarkdown(md);
    const mappings = mapTokensToSlides(result.tokens);
    const stats = getMappingStatistics(mappings);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.averageConfidence).toBeGreaterThan(0);
  });
});

describe("슬라이드 생성기 통합 테스트", () => {
  it("마크다운에서 슬라이드 Props를 직접 생성한다", () => {
    const md = `# AI 기술 트렌드

## 주요 기술
- **GPT**: 자연어 처리
- **DALL-E**: 이미지 생성
- **Codex**: 코드 생성

> 인공지능은 새로운 전기이다 — 앤드류 응

1. 데이터 수집
2. 모델 훈련
3. 평가 및 배포`;
    const slides = generateSlidesFromMarkdown(md);
    expect(slides.length).toBeGreaterThanOrEqual(3);

    // 각 슬라이드에 고유 ID가 있는지 확인
    const ids = slides.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // 각 슬라이드에 type이 있는지 확인
    for (const slide of slides) {
      expect(slide.type).toBeDefined();
      expect(["title", "card-grid", "comparison", "timeline", "quote", "table"]).toContain(slide.type);
    }
  });

  it("매핑 결과에서 슬라이드 Props를 생성한다", () => {
    const md = `# 테스트 프레젠테이션

- **기능 1**: 빠른 처리 속도
- **기능 2**: 높은 안정성
- **기능 3**: 쉬운 확장`;
    const parseResult = parseMarkdown(md);
    const mappings = mapTokensToSlides(parseResult.tokens);
    const slides = createSlidesFromMappings(mappings);

    expect(slides.length).toBe(mappings.length);
    for (const slide of slides) {
      expect(slide.id).toBeDefined();
      expect(slide.type).toBeDefined();
    }
  });

  it("슬라이드 미리보기 텍스트를 생성한다", () => {
    const md = `# 프레젠테이션 제목`;
    const slides = generateSlidesFromMarkdown(md);
    expect(slides.length).toBeGreaterThan(0);

    const previewText = getSlidePreviewText(slides[0]);
    expect(previewText).toBeTruthy();
    expect(previewText.length).toBeGreaterThan(0);
  });

  it("빈 마크다운을 처리할 수 있다", () => {
    const slides = generateSlidesFromMarkdown("");
    expect(slides).toHaveLength(0);
  });

  it("복잡한 프레젠테이션을 완전히 변환한다", () => {
    const md = `# 2026년 기술 전망

발표자: 김슬라이드

## 핵심 트렌드

- **AI 에이전트**: 자율적으로 작업을 수행하는 AI
- **양자 컴퓨팅**: 기존 컴퓨터의 한계 돌파
- **웹3**: 탈중앙화 인터넷

## AI vs 전통 소프트웨어

- **AI**: 학습 기반, 데이터 의존적, 확률적 출력
- **전통**: 규칙 기반, 결정적 출력, 예측 가능

## 도입 로드맵

1. 현황 분석 및 목표 설정
2. 파일럿 프로젝트 진행
3. 확대 적용 및 최적화
4. 전사 배포 및 모니터링

## 성과 지표

| 지표 | 목표 | 현재 |
| --- | --- | --- |
| 생산성 | 30% 향상 | 15% 향상 |
| 비용 | 20% 절감 | 10% 절감 |
| 만족도 | 90% | 75% |

> 미래를 예측하는 최선의 방법은 미래를 만드는 것이다 — 앨런 케이`;

    const slides = generateSlidesFromMarkdown(md);
    expect(slides.length).toBeGreaterThanOrEqual(5);

    const types = slides.map((s) => s.type);
    console.log("생성된 슬라이드 타입:", types);

    // 제목 슬라이드가 있어야 함
    expect(types).toContain("title");
  });
});
