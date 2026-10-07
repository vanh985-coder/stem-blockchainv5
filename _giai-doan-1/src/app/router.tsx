import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './layout';
import { ErrorBoundary } from './ErrorBoundary';
import { Home } from '../pages/Home';
import { LESSONS_REGISTRY } from '../lessons/registry';

// Lazy load các trang thứ cấp và công cụ dev để giảm JS ban đầu
const Settings = lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings })));
const Summary = lazy(() => import('../pages/Summary').then((m) => ({ default: m.Summary })));
const SelfTest = lazy(() => import('../pages/SelfTest').then((m) => ({ default: m.SelfTest })));
const UiGallery = lazy(() => import('../pages/UiGallery').then((m) => ({ default: m.UiGallery })));
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));

// Tạo map các component lazy load trực tiếp từ registry
const lessonComponents = LESSONS_REGISTRY.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  Component: lazy(lesson.load as () => Promise<{ default: React.ComponentType }>),
}));

const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="w-12 h-12 rounded-2xl bg-[#5B3FD6]/10 border-2 border-[#5B3FD6] flex items-center justify-center animate-bounce mb-3">
      <span className="text-xl">📖</span>
    </div>
    <div className="font-display font-bold text-sm text-[#5B3FD6] animate-pulse">
      Đang lật mở trang sổ...
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Trang chủ */}
          <Route path="/" element={<Home />} />

          {/* 5 bài học đọc trực tiếp từ registry kèm ErrorBoundary độc lập */}
          {lessonComponents.map(({ id, title, Component }) => (
            <Route
              key={id}
              path={`/lesson/${id}`}
              element={
                <ErrorBoundary fallbackTitle={`${title} gặp sự cố`}>
                  <Suspense fallback={<PageLoader />}>
                    <Component />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          ))}

          {/* Trang Tổng kết & Cài đặt */}
          <Route
            path="/summary"
            element={
              <Suspense fallback={<PageLoader />}>
                <Summary />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            }
          />

          {/* Các trang công cụ cho Developer (Self-test & UI Gallery) */}
          <Route
            path="/dev/self-test"
            element={
              <Suspense fallback={<PageLoader />}>
                <SelfTest />
              </Suspense>
            }
          />
          <Route
            path="/dev/ui"
            element={
              <Suspense fallback={<PageLoader />}>
                <UiGallery />
              </Suspense>
            }
          />

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
};
