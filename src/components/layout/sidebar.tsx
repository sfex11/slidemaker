"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Folder,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock project data - 실제로는 DB에서 가져와야 함
const mockProjects = [
  {
    id: "1",
    name: "Q4 실적 발표 자료",
    updatedAt: new Date("2024-01-15"),
    slideCount: 12,
  },
  {
    id: "2",
    name: "제품 소개서",
    updatedAt: new Date("2024-01-14"),
    slideCount: 8,
  },
  {
    id: "3",
    name: "팀 온보딩 가이드",
    updatedAt: new Date("2024-01-10"),
    slideCount: 15,
  },
  {
    id: "4",
    name: "마케팅 전략안",
    updatedAt: new Date("2024-01-08"),
    slideCount: 20,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}개월 전`;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-muted-foreground">
            프로젝트
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(isCollapsed && "mx-auto")}
          aria-label={isCollapsed ? "사이드바 확장" : "사이드바 축소"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Project Button */}
      <div className={cn("p-4", isCollapsed && "px-2")}>
        <Link href="/projects/new">
          <Button
            className={cn("w-full", isCollapsed && "px-2")}
            size={isCollapsed ? "icon" : "default"}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">새 프로젝트</span>}
          </Button>
        </Link>
      </div>

      {/* Project List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          <AnimatePresence mode="popLayout">
            {mockProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/projects/${project.id}`}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                      pathname === `/projects/${project.id}` &&
                        "bg-accent text-accent-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{project.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(project.updatedAt)}</span>
                            <span className="mx-1">·</span>
                            <span>{project.slideCount}장</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>이름 변경</DropdownMenuItem>
                            <DropdownMenuItem>복제</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background md:relative md:inset-auto md:z-auto transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
