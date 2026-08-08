import { Suspense, useMemo } from 'react';
import { lazyWithRetry as lazy } from '@/utils/lazyWithRetry';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import useAuth from '@/hooks/useAuth';
import useLocale from '@/hooks/useLocale';
export function Layout() {
  const { authenticated } = useAuth();
  useLocale();

  const AppLayout = useMemo(() => {
    if (authenticated) {
      return lazy(() => import('./LayoutTypes/DefaultLayout'));
    }
    return lazy(() => import('./AuthLayout'));
  }, [authenticated]);

  return (
      <Suspense
        fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
            <LoadingScreen />
          </div>
        }
      >
        <AppLayout />
      </Suspense>
  );
}
