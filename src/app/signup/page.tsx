"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SocialButtons, Divider, AuthForm } from "@/components/auth";

/**
 * 회원가입 페이지 내용 컴포넌트
 */
function SignupContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || undefined;
  const error = searchParams.get("error");

  // 에러 메시지 매핑
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "OAuthSignin":
        return "OAuth 가입 시작 중 오류가 발생했습니다.";
      case "OAuthCallback":
        return "OAuth 콜백 처리 중 오류가 발생했습니다.";
      case "OAuthCreateAccount":
        return "OAuth 계정 생성 중 오류가 발생했습니다.";
      case "EmailCreateAccount":
        return "이메일 계정 생성 중 오류가 발생했습니다.";
      case "Callback":
        return "콜백 처리 중 오류가 발생했습니다.";
      case "OAuthAccountNotLinked":
        return "이미 다른 방법으로 가입된 이메일입니다.";
      case "EmailSignin":
        return "이메일 가입 중 오류가 발생했습니다.";
      default:
        return errorCode ? "회원가입 중 오류가 발생했습니다." : null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green/20 rounded-full blur-3xl" />
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
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <CardTitle className="text-2xl font-bold">
                계정 만들기
              </CardTitle>
              <CardDescription className="mt-2">
                Slide SaaS에 가입하고 AI 슬라이드를 시작하세요
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 에러 메시지 */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center"
              >
                {errorMessage}
              </motion.div>
            )}

            {/* 소셜 회원가입 버튼 */}
            <SocialButtons callbackUrl={callbackUrl} />

            {/* 구분선 */}
            <Divider />

            {/* 이메일 회원가입 폼 (선택사항) */}
            <AuthForm mode="signup" callbackUrl={callbackUrl} />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="text-accent hover:text-accent/80 font-medium transition-colors"
              >
                로그인
              </Link>
            </div>

            {/* 이용약관 동의 안내 */}
            <p className="text-center text-xs text-muted-foreground">
              가입하시면{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                이용약관
              </Link>
              과{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                개인정보처리방침
              </Link>
              에 동의하게 됩니다.
            </p>
          </CardFooter>
        </Card>

        {/* 하단 링크 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground transition-colors">
            홈으로 돌아가기
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * 회원가입 페이지 로딩 스켈레톤
 */
function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      <div className="w-full max-w-md animate-pulse">
        <div className="rounded-xl border border-border/50 bg-card/95 p-6 shadow-xl">
          <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-2/3 mx-auto mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-px bg-border my-6" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 회원가입 페이지
 *
 * 소셜 회원가입 (Google, GitHub)과 이메일 회원가입을 지원합니다.
 * callbackUrl 쿼리 파라미터로 리다이렉트 URL을 받을 수 있습니다.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupContent />
    </Suspense>
  );
}
