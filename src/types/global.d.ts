/**
 * 전역 타입 정의
 */

// 전역 export 캐시 타입
interface ExportCacheEntry {
  content: string | Buffer;
  format: string;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __exportCache: Map<string, ExportCacheEntry> | undefined;
}

export {};
