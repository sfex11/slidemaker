"use client";

/**
 * 슬라이드 생성 페이지
 * URL, 마크다운, 또는 PDF로 슬라이드를 생성합니다.
 */

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Link2, FileText, Upload, Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/session";

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [markdown, setMarkdown] = useState("");
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 인증 확인
  if (!authLoading && !isAuthenticated) {
    router.push(`/login?callbackUrl=${encodeURIComponent("/create")}`);
    return null;
  }

  // URL로 슬라이드 생성
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          options: { maxSlides: 10, language: "ko" },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "슬라이드 생성에 실패했습니다.");
      }

      // 성공 시 프로젝트 페이지로 이동
      if (data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        // 미리보기 페이지로 이동
        router.push(`/preview?slides=${encodeURIComponent(JSON.stringify(data.slides))}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 마크다운으로 슬라이드 생성
  const handleMarkdownSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markdown.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/from-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: markdown.trim(),
          title: title.trim() || undefined,
          options: { maxSlides: 10, language: "ko" },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "슬라이드 생성에 실패했습니다.");
      }

      // 성공 시 프로젝트 페이지로 이동
      if (data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        // 미리보기 페이지로 이동
        router.push(`/preview?slides=${encodeURIComponent(JSON.stringify(data.slides))}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // PDF 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("파일이 너무 큽니다. 최대 20MB까지 업로드 가능합니다.");
      return;
    }

    setError(null);
    setPdfFile(file);
  };

  // PDF 파일 제거
  const handleRemoveFile = () => {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 드래그 앤 드롭 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("파일이 너무 큽니다. 최대 20MB까지 업로드 가능합니다.");
      return;
    }

    setError(null);
    setPdfFile(file);
  };

  // PDF로 슬라이드 생성
  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append(
        "options",
        JSON.stringify({ maxSlides: 10, language: "ko" })
      );

      const response = await fetch("/api/generate/from-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "슬라이드 생성에 실패했습니다.");
      }

      // 성공 시 프로젝트 페이지로 이동
      if (data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        // 미리보기 페이지로 이동
        router.push(`/preview?slides=${encodeURIComponent(JSON.stringify(data.slides))}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* 헤더 */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: "var(--slide-text)" }}>
            새 슬라이드 생성
          </h1>
          <p className="mt-2 text-muted-foreground">
            URL, 마크다운, 또는 PDF를 입력하여 AI가 슬라이드를 자동으로 생성합니다.
          </p>
        </motion.div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* 생성 폼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                마크다운
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>

            {/* URL 탭 */}
            <TabsContent value="url">
              <Card>
                <CardHeader>
                  <CardTitle>URL로 슬라이드 생성</CardTitle>
                  <CardDescription>
                    웹 페이지의 내용을 분석하여 자동으로 슬라이드를 생성합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUrlSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">웹 페이지 URL</label>
                      <Input
                        type="url"
                        placeholder="https://example.com/article"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !url.trim()}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        "슬라이드 생성"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 마크다운 탭 */}
            <TabsContent value="markdown">
              <Card>
                <CardHeader>
                  <CardTitle>마크다운으로 슬라이드 생성</CardTitle>
                  <CardDescription>
                    마크다운 텍스트를 입력하면 AI가 구조화된 슬라이드로 변환합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMarkdownSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">제목 (선택)</label>
                      <Input
                        type="text"
                        placeholder="프레젠테이션 제목"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">마크다운 내용</label>
                      <Textarea
                        placeholder={`# 제목

## 섹션 1
- 항목 1
- 항목 2
- 항목 3

## 섹션 2
내용을 입력하세요...`}
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        rows={12}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !markdown.trim()}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        "슬라이드 생성"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDF 탭 */}
            <TabsContent value="pdf">
              <Card>
                <CardHeader>
                  <CardTitle>PDF로 슬라이드 생성</CardTitle>
                  <CardDescription>
                    PDF 문서의 내용을 추출하여 AI가 슬라이드로 변환합니다.
                    최대 20MB, 50페이지까지 지원합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePdfSubmit} className="space-y-4">
                    {/* 파일 업로드 영역 */}
                    {!pdfFile ? (
                      <div
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50 cursor-pointer"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mb-4 h-10 w-10 text-muted-foreground/50" />
                        <p className="mb-1 text-sm font-medium">
                          PDF 파일을 드래그하거나 클릭하여 선택
                        </p>
                        <p className="text-xs text-muted-foreground">
                          최대 20MB, PDF 형식만 지원
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{pdfFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(pdfFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !pdfFile}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          PDF 분석 중...
                        </>
                      ) : (
                        "슬라이드 생성"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

function CreatePageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreatePageLoading />}>
      <CreatePageContent />
    </Suspense>
  );
}
