/**
 * Application router with lazy-loaded pages and BackButton integration.
 *
 * All 8 routes are code-split via React.lazy for optimal bundle size.
 * BrowserRouter provides client-side routing for the TMA.
 * useBackButton syncs Telegram's BackButton with navigation state.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { Skeleton } from '@/shared/ui';
import { useBackButton } from '@/shared/hooks/useBackButton';

// Lazy-loaded page chunks
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Learn = lazy(() => import('@/pages/Learn'));
const Train = lazy(() => import('@/pages/Train'));
const Support = lazy(() => import('@/pages/Support'));
const Casebook = lazy(() => import('@/pages/Casebook'));
const Leads = lazy(() => import('@/pages/Leads'));
const Profile = lazy(() => import('@/pages/Profile'));
const Admin = lazy(() => import('@/pages/Admin'));

/**
 * Page loading fallback using the design system Skeleton.
 */
function PageSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <Skeleton height={28} width="40%" />
      <Skeleton height={80} />
      <Skeleton height={80} />
    </div>
  );
}

/**
 * Inner router component that has access to router context.
 * useBackButton must be called inside BrowserRouter.
 */
function AppRoutes() {
  useBackButton();

  return (
    <AppLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learn/*" element={<Learn />} />
          <Route path="/train/*" element={<Train />} />
          <Route path="/support/*" element={<Support />} />
          <Route path="/casebook/*" element={<Casebook />} />
          <Route path="/leads/*" element={<Leads />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
