"use client";

/**
 * 슬라이드 미리보기 페이지
 * 생성된 슬라이드를 미리보기하고 드래그 앤 드롭으로 순서를 변경할 수 있습니다.
 */

import { useState, useEffect, Suspense, useCallback, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TitleSlide,
  CardGrid,
  ComparisonSlide,
  TimelineSlide,
  QuoteSlide,
  TableSlide,
} from "@/components/slides";
import { SortableSlideList } from "@/components/slide-editor";
import type { SlideProps } from "@/types/slide";

// 슬라이드 파싱 유틸리티 함수
function parseSlidesFromParams(searchParams: URLSearchParams): {
  slides: SlideProps[];
  projectId: string | null;
} {
  const slidesParam = searchParams.get("slides");
  const projectIdParam = searchParams.get("projectId");
  let parsedSlides: SlideProps[] = [];

  if (slidesParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(slidesParam));
      parsedSlides = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("슬라이드 파싱 오류:", e);
    }
  }

  return { slides: parsedSlides, projectId: projectIdParam };
}

// 클라이언트 전용 스토어 구독 훅
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function PreviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();

  // 초기 데이터 파싱
  const { slides: initialSlides, projectId: initialProjectId } = parseSlidesFromParams(searchParams);

  const [slides, setSlides] = useState<SlideProps[]>(initialSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const projectId = initialProjectId;

  const currentSlide = slides[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < slides.length - 1;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, slides.length]);

  // 슬라이드 재정렬 핸들러
  const handleReorder = useCallback((newSlides: SlideProps[]) => {
    setSlides(newSlides);
    // 현재 선택된 슬라이드가 여전히 존재하는지 확인
    setCurrentIndex((prevIndex) => {
      if (prevIndex >= newSlides.length) {
        return Math.max(0, newSlides.length - 1);
      }
      return prevIndex;
    });
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  // 하이드레이션 전에는 로딩 표시
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">슬라이드가 없습니다</h1>
          <p className="mt-2 text-muted-foreground">
            표시할 슬라이드가 없습니다.
          </p>
          <Button className="mt-4" onClick={() => router.push("/create")}>
            새 슬라이드 생성
          </Button>
        </div>
      </div>
    );
  }

  // 슬라이드 렌더링
  const renderSlide = (slide: SlideProps) => {
    switch (slide.type) {
      case "title":
        return <TitleSlide {...slide} />;
      case "card-grid":
        return <CardGrid {...slide} />;
      case "comparison":
        return <ComparisonSlide {...slide} />;
      case "timeline":
        return <TimelineSlide {...slide} />;
      case "quote":
        return <QuoteSlide {...slide} />;
      case "table":
        return <TableSlide {...slide} />;
      default:
        return (
          <div className="flex h-full items-center justify-center">
            <p>알 수 없는 슬라이드 타입</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            저장
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 슬라이드 영역 */}
      <div className="relative mx-auto aspect-video max-w-5xl overflow-hidden rounded-xl border bg-card shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderSlide(currentSlide)}
          </motion.div>
        </AnimatePresence>

        {/* 네비게이션 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2"
          disabled={!canGoPrev}
          onClick={handlePrev}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2"
          disabled={!canGoNext}
          onClick={handleNext}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* 슬라이드 썸네일 (드래그 앤 드롭 지원) */}
      <div className="mt-6">
        <SortableSlideList
          slides={slides}
          currentIndex={currentIndex}
          onSlideSelect={setCurrentIndex}
          onReorder={handleReorder}
          projectId={projectId || undefined}
        />
      </div>
    </div>
  );
}

function PreviewPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<PreviewPageLoading />}>
      <PreviewPageContent />
    </Suspense>
  );
}
