"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

/**
 * 인증 에러 페이지 내용 컴포넌트
 */
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // 에러 메시지 매핑
  const getErrorInfo = (errorCode: string | null) => {
    switch (errorCode) {
      case "Configuration":
        return {
          title: "서버 설정 오류",
          description: "인증 서버 설정에 문제가 있습니다. 관리자에게 문의해주세요.",
          icon: AlertCircle,
        };
      case "AccessDenied":
        return {
          title: "접근 거부",
          description: "이 페이지에 접근할 권한이 없습니다.",
          icon: AlertCircle,
        };
      case "Verification":
        return {
          title: "인증 만료",
          description: "인증 링크가 만료되었습니다. 다시 시도해주세요.",
          icon: AlertCircle,
        };
      case "OAuthSignin":
        return {
          title: "로그인 오류",
          description: "소셜 로그인 중 오류가 발생했습니다.",
          icon: AlertCircle,
        };
      case "OAuthCallback":
        return {
          title: "콜백 오류",
          description: "로그인 콜백 처리 중 오류가 발생했습니다.",
          icon: AlertCircle,
        };
      case "OAuthCreateAccount":
        return {
          title: "계정 생성 오류",
          description: "소셜 계정 연동 중 오류가 발생했습니다.",
          icon: AlertCircle,
        };
      case "OAuthAccountNotLinked":
        return {
          title: "계정 연동 불가",
          description: "이미 다른 로그인 방법으로 가입된 이메일입니다. 기존 방법으로 로그인해주세요.",
          icon: AlertCircle,
        };
      case "EmailCreateAccount":
        return {
          title: "계정 생성 오류",
          description: "이메일로 계정 생성 중 오류가 발생했습니다.",
          icon: AlertCircle,
        };
      case "Callback":
        return {
          title: "콜백 오류",
          description: "인증 콜백 처리 중 오류가 발생했습니다.",
          icon: AlertCircle,
        };
      case "OAuthSessionRequired":
        return {
          title: "세션 필요",
          description: "이 작업을 수행하려면 로그인이 필요합니다.",
          icon: AlertCircle,
        };
      default:
        return {
          title: "인증 오류",
          description: "인증 중 알 수 없는 오류가 발생했습니다.",
          icon: AlertCircle,
        };
    }
  };

  const errorInfo = getErrorInfo(error);
  const Icon = errorInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-destructive/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
            >
              <Icon className="w-8 h-8 text-destructive" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* 에러 코드 표시 (개발 환경) */}
            {process.env.NODE_ENV === "development" && error && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground font-mono">
                Error Code: {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/login">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 로그인하기
              </Link>
            </Button>

            <div className="flex gap-3 w-full">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  홈으로
                </Link>
              </Button>

              <Button variant="ghost" asChild className="flex-1">
                <button onClick={() => window.history.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  이전 페이지
                </button>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* 도움말 링크 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          문제가 지속되면{" "}
          <Link href="/support" className="text-accent hover:text-accent/80 underline">
            고객 지원
          </Link>
          에 문의해주세요.
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * 인증 에러 페이지 로딩 스켈레톤
 */
function AuthErrorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="rounded-xl border border-border/50 bg-card/95 p-6 shadow-xl">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4" />
          <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-2/3 mx-auto mb-6" />
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="flex gap-3">
              <div className="h-10 bg-muted rounded flex-1" />
              <div className="h-10 bg-muted rounded flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 인증 에러 페이지
 *
 * NextAuth에서 발생한 인증 에러를 표시하고
 * 재시도 또는 다른 페이지로 이동할 수 있는 옵션을 제공합니다.
 */
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorLoading />}>
      <AuthErrorContent />
    </Suspense>
  );
}
