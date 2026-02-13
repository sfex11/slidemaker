"use client";

/**
 * 프로젝트 편집 페이지
 * 슬라이드 편집기 UI를 제공합니다.
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Canvas } from "@/components/slide-editor/canvas";
import { PropertiesPanel } from "@/components/slide-editor/properties-panel";
import { Toolbar } from "@/components/slide-editor/toolbar";
import { SortableSlideList } from "@/components/slide-editor";
import type { SlideProps } from "@/types/slide";
import { themes, themeVariablesToCss } from "@/lib/themes";

interface Project {
  id: string;
  name: string;
  description: string | null;
  slides: Array<{
    id: string;
    order: number;
    type: string;
    content: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
}

// 데이터베이스 슬라이드를 SlideProps로 변환
function transformSlide(slide: Project["slides"][0]): SlideProps {
  const content = slide.content;
  return {
    id: slide.id,
    type: slide.type as SlideProps["type"],
    ...content,
  } as SlideProps;
}

function EditorPageContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<SlideProps[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSlide = slides[currentIndex];

  // 프로젝트 데이터 로드
  useEffect(() => {
    async function fetchProject() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error("프로젝트를 불러오는데 실패했습니다.");
        }
        const data = await response.json();
        setProject(data.data);
        setSlides(data.data.slides.map(transformSlide));
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // 슬라이드 재정렬 핸들러
  const handleReorder = useCallback((newSlides: SlideProps[]) => {
    setSlides(newSlides);
    setCurrentIndex((prevIndex) => {
      if (prevIndex >= newSlides.length) {
        return Math.max(0, newSlides.length - 1);
      }
      return prevIndex;
    });
  }, []);

  // 슬라이드 내용 업데이트 핸들러
  const handleSlideUpdate = useCallback(
    async (updatedSlide: SlideProps) => {
      const newSlides = [...slides];
      newSlides[currentIndex] = updatedSlide;
      setSlides(newSlides);

      // API로 저장
      try {
        setIsSaving(true);
        const response = await fetch(`/api/projects/${projectId}/slides/${updatedSlide.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: updatedSlide,
          }),
        });

        if (!response.ok) {
          throw new Error("슬라이드 저장에 실패했습니다.");
        }
      } catch (err) {
        console.error("슬라이드 저장 오류:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [slides, currentIndex, projectId]
  );

  // 테마 변경 핸들러
  const handleThemeChange = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!project) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: project.name,
          description: project.description,
        }),
      });

      if (!response.ok) {
        throw new Error("프로젝트 저장에 실패했습니다.");
      }

      // 모든 슬라이드 저장
      await Promise.all(
        slides.map((slide) =>
          fetch(`/api/projects/${projectId}/slides/${slide.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: slide,
            }),
          })
        )
      );
    } catch (err) {
      console.error("저장 오류:", err);
    } finally {
      setIsSaving(false);
    }
  }, [project, projectId, slides]);

  // 내보내기 핸들러
  const handleExport = useCallback(
    async (format: "html" | "pdf") => {
      try {
        const response = await fetch(`/api/projects/${projectId}/export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ format }),
        });

        if (!response.ok) {
          throw new Error("내보내기에 실패했습니다.");
        }

        const data = await response.json();
        // 다운로드 URL로 이동
        if (data.data?.downloadUrl) {
          window.open(data.data.downloadUrl, "_blank");
        }
      } catch (err) {
        console.error("내보내기 오류:", err);
      }
    },
    [projectId]
  );

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">프로젝트 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">오류 발생</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 슬라이드가 없는 경우
  if (!project || slides.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">슬라이드가 없습니다</h1>
          <p className="mt-2 text-muted-foreground">이 프로젝트에는 슬라이드가 없습니다.</p>
          <Button className="mt-4" onClick={() => router.push("/create")}>
            슬라이드 생성하기
          </Button>
        </div>
      </div>
    );
  }

  // 현재 테마의 CSS 변수 가져오기
  const theme = themes.find((t) => t.id === currentTheme) || themes[0];
  const themeCssVars = themeVariablesToCss(theme.light);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 툴바 */}
      <Toolbar
        projectName={project.name}
        isSaving={isSaving}
        onSave={handleSave}
        onExport={handleExport}
        onBack={() => router.push("/dashboard")}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 슬라이드 목록 */}
        <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">슬라이드 목록</h2>
          <SortableSlideList
            slides={slides}
            currentIndex={currentIndex}
            onSlideSelect={setCurrentIndex}
            onReorder={handleReorder}
            projectId={projectId}
          />
        </div>

        {/* 중앙: 캔버스 */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto" style={themeCssVars}>
          {currentSlide && <Canvas slide={currentSlide} theme={currentTheme} />}
        </div>

        {/* 오른쪽: 속성 패널 */}
        <div className="w-80 border-l bg-card overflow-y-auto">
          {currentSlide && (
            <PropertiesPanel
              slide={currentSlide}
              theme={currentTheme}
              onSlideUpdate={handleSlideUpdate}
              onThemeChange={handleThemeChange}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EditorPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorPageLoading />}>
      <EditorPageContent />
    </Suspense>
  );
}
