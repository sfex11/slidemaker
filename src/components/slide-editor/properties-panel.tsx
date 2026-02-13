"use client";

/**
 * PropertiesPanel 컴포넌트
 * 슬라이드 내용 편집 및 테마 선택을 제공합니다.
 */

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Palette, Type, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { themes } from "@/lib/themes";
import type { SlideProps, TitleSlideProps, QuoteSlideProps } from "@/types/slide";

interface PropertiesPanelProps {
  slide: SlideProps;
  theme: string;
  onSlideUpdate: (slide: SlideProps) => void;
  onThemeChange: (themeId: string) => void;
  isSaving: boolean;
  className?: string;
}

export function PropertiesPanel({
  slide,
  theme,
  onSlideUpdate,
  onThemeChange,
  isSaving,
  className,
}: PropertiesPanelProps) {
  // 로컬 상태 (즉시 편집용)
  const [localSlide, setLocalSlide] = useState<SlideProps>(slide);

  // slide가 변경되면 localSlide 업데이트
  useState(() => {
    setLocalSlide(slide);
  });

  // 입력값 변경 핸들러
  const handleInputChange = useCallback(
    (field: string, value: string) => {
      const updated = { ...localSlide, [field]: value } as SlideProps;
      setLocalSlide(updated);
    },
    [localSlide]
  );

  // 저장 버튼 클릭 핸들러
  const handleSave = useCallback(() => {
    onSlideUpdate(localSlide);
  }, [localSlide, onSlideUpdate]);

  // 슬라이드 타입별 편집 폼 렌더링
  const renderEditForm = () => {
    switch (localSlide.type) {
      case "title":
        return <TitleSlideForm slide={localSlide as TitleSlideProps} onChange={handleInputChange} />;
      case "quote":
        return <QuoteSlideForm slide={localSlide as QuoteSlideProps} onChange={handleInputChange} />;
      case "card-grid":
        return <CardGridForm slide={localSlide} onChange={handleInputChange} />;
      case "comparison":
        return <ComparisonSlideForm slide={localSlide} onChange={handleInputChange} />;
      case "timeline":
        return <TimelineSlideForm slide={localSlide} onChange={handleInputChange} />;
      case "table":
        return <TableSlideForm slide={localSlide} onChange={handleInputChange} />;
      default:
        return (
          <div className="text-sm text-muted-foreground">
            이 슬라이드 타입은 편집이 지원되지 않습니다.
          </div>
        );
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 헤더 */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">속성</h2>
        <p className="text-sm text-muted-foreground">슬라이드 내용을 편집합니다.</p>
      </div>

      {/* 스크롤 가능한 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 슬라이드 타입 표시 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Type className="h-4 w-4" />
          <span>슬라이드 타입: {localSlide.type}</span>
        </div>

        {/* 테마 선택 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            테마
          </Label>
          <Select value={theme} onValueChange={onThemeChange}>
            <SelectTrigger>
              <SelectValue placeholder="테마 선택" />
            </SelectTrigger>
            <SelectContent>
              {themes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 구분선 */}
        <div className="border-t" />

        {/* 슬라이드 편집 폼 */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            콘텐츠
          </Label>
          {renderEditForm()}
        </div>
      </div>

      {/* 하단 저장 버튼 */}
      <div className="border-t p-4">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

// 타이틀 슬라이드 편집 폼
function TitleSlideForm({
  slide,
  onChange,
}: {
  slide: TitleSlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={slide.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="슬라이드 제목을 입력하세요"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">부제</Label>
        <Input
          id="subtitle"
          value={slide.subtitle || ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="부제를 입력하세요"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="presenter">발표자</Label>
        <Input
          id="presenter"
          value={slide.presenter || ""}
          onChange={(e) => onChange("presenter", e.target.value)}
          placeholder="발표자명을 입력하세요"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">날짜</Label>
        <Input
          id="date"
          value={slide.date || ""}
          onChange={(e) => onChange("date", e.target.value)}
          placeholder="날짜를 입력하세요"
        />
      </div>
    </div>
  );
}

// 인용문 슬라이드 편집 폼
function QuoteSlideForm({
  slide,
  onChange,
}: {
  slide: QuoteSlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quote">인용문</Label>
        <Textarea
          id="quote"
          value={slide.quote || ""}
          onChange={(e) => onChange("quote", e.target.value)}
          placeholder="인용문을 입력하세요"
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="author">저자</Label>
        <Input
          id="author"
          value={slide.author || ""}
          onChange={(e) => onChange("author", e.target.value)}
          placeholder="저자명을 입력하세요"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="source">출처</Label>
        <Input
          id="source"
          value={slide.source || ""}
          onChange={(e) => onChange("source", e.target.value)}
          placeholder="출처를 입력하세요"
        />
      </div>
    </div>
  );
}

// 카드 그리드 슬라이드 편집 폼 (간단 버전)
function CardGridForm({
  slide,
  onChange,
}: {
  slide: SlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={(slide as { title?: string }).title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="슬라이드 제목을 입력하세요"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        카드 내용 편집은 추후 지원 예정입니다.
      </div>
    </div>
  );
}

// 비교 슬라이드 편집 폼 (간단 버전)
function ComparisonSlideForm({
  slide,
  onChange,
}: {
  slide: SlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={(slide as { title?: string }).title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="슬라이드 제목을 입력하세요"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        비교 내용 편집은 추후 지원 예정입니다.
      </div>
    </div>
  );
}

// 타임라인 슬라이드 편집 폼 (간단 버전)
function TimelineSlideForm({
  slide,
  onChange,
}: {
  slide: SlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={(slide as { title?: string }).title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="슬라이드 제목을 입력하세요"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        타임라인 항목 편집은 추후 지원 예정입니다.
      </div>
    </div>
  );
}

// 테이블 슬라이드 편집 폼 (간단 버전)
function TableSlideForm({
  slide,
  onChange,
}: {
  slide: SlideProps;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={(slide as { title?: string }).title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="슬라이드 제목을 입력하세요"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        테이블 내용 편집은 추후 지원 예정입니다.
      </div>
    </div>
  );
}

export default PropertiesPanel;
