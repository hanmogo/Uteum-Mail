import type { Metadata } from "next";
import { Suspense } from "react";
import { PrototypeProvider } from "@/lib/prototype/context";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uteum Mail · 내 메일에 여유를",
  description: "가상 데이터로 체험하는 통합 이메일 비서 웹 프로토타입",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <PrototypeProvider>
          <Suspense
            fallback={
              <div className="boot-screen">
                Uteum Mail · 체험 화면을 준비하고 있습니다.
              </div>
            }
          >
            <AppShell>{children}</AppShell>
          </Suspense>
        </PrototypeProvider>
      </body>
    </html>
  );
}
