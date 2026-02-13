"use client";

/**
 * Toolbar 컴포넌트
 * 프로젝트 이름 표시, 저장 버튼, 내보내기 버튼을 제공합니다.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Save, Download, FileCode, FileText, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  projectName: string;
  isSaving: boolean;
  onSave: () => void;
  onExport: (format: "html" | "pdf") => void;
  onBack: () => void;
  className?: string;
}

export function Toolbar({
  projectName,
  isSaving,
  onSave,
  onExport,
  onBack,
  className,
}: ToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"html" | "pdf" | null>(null);

  const handleExport = async (format: "html" | "pdf") => {
    setIsExporting(true);
    setExportFormat(format);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  return (
    <div className={cn("border-b bg-background px-4 py-2", className)}>
      <div className="flex items-center justify-between">
        {/* 왼쪽: 뒤로 가기 + 프로젝트 이름 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold truncate max-w-xs md:max-w-md lg:max-w-lg">
            {projectName}
          </h1>
        </div>

        {/* 오른쪽: 저장 + 내보내기 */}
        <div className="flex items-center gap-2">
          {/* 저장 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                저장
              </>
            )}
          </Button>

          {/* 내보내기 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                내보내기
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleExport("html")}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting && exportFormat === "html" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCode className="h-4 w-4" />
                )}
                <div>
                  <div>HTML</div>
                  <div className="text-xs text-muted-foreground">웹 페이지 형식</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting && exportFormat === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <div>
                  <div>PDF</div>
                  <div className="text-xs text-muted-foreground">문서 형식</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
