"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Link as LinkIcon,
  FileText,
  FileUp,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock recent projects data
const recentProjects = [
  {
    id: "1",
    name: "Q4 실적 발표 자료",
    description: "2024년 4분기 실적 발표를 위한 슬라이드",
    slideCount: 12,
    thumbnail: null,
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "제품 소개서",
    description: "신제품 런칭을 위한 마케팅 슬라이드",
    slideCount: 8,
    thumbnail: null,
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    name: "팀 온보딩 가이드",
    description: "신규 입사자를 위한 온보딩 프레젠테이션",
    slideCount: 15,
    thumbnail: null,
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "4",
    name: "마케팅 전략안",
    description: "2024년 마케팅 전략 발표 자료",
    slideCount: 20,
    thumbnail: null,
    updatedAt: new Date("2024-01-08"),
  },
];

const quickCreateOptions = [
  {
    title: "URL로 생성",
    description: "웹페이지 URL을 입력해 슬라이드 생성",
    icon: LinkIcon,
    href: "/create?url",
    color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  },
  {
    title: "마크다운으로 생성",
    description: "마크다운 문서를 슬라이드로 변환",
    icon: FileText,
    href: "/create?markdown",
    color: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  },
  {
    title: "PDF로 생성",
    description: "PDF 파일을 업로드해 슬라이드 생성",
    icon: FileUp,
    href: "/create?pdf",
    color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      {/* Welcome Section */}
      <motion.section
        className="mb-8 md:mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              안녕하세요, 홍길동님!
            </h1>
            <p className="text-muted-foreground mt-1">
              오늘도 멋진 슬라이드를 만들어 볼까요?
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              새 프로젝트 만들기
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Quick Create Section */}
      <motion.section
        className="mb-8 md:mb-12"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">빠른 생성</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickCreateOptions.map((option) => (
            <motion.div key={option.title} variants={itemVariants}>
              <Link href={option.href}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${option.color}`}
                      >
                        <option.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          {option.title}
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Recent Projects Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">최근 프로젝트</h2>
          </div>
          <Link href="/projects">
            <Button variant="ghost" className="gap-2">
              전체 보기
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {recentProjects.map((project, index) => (
            <motion.div key={project.id} variants={itemVariants}>
              <Link href={`/projects/${project.id}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    {/* Thumbnail placeholder */}
                    <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                      <div className="text-muted-foreground/50">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="8" y1="8" x2="16" y2="8" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                          <line x1="8" y1="16" x2="12" y2="16" />
                        </svg>
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.slideCount}장</span>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Empty State (shown when no projects) */}
      {/*
      <motion.section
        className="flex flex-col items-center justify-center py-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">아직 프로젝트가 없습니다</h3>
        <p className="text-muted-foreground text-center mb-4">
          첫 번째 슬라이드 프로젝트를 만들어 보세요!
        </p>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트 만들기
          </Button>
        </Link>
      </motion.section>
      */}
    </div>
  );
}
