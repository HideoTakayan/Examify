import { useEffect, useState } from 'react';
import { Alert, Box, Loader, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import dashboardApi from '@/services/dashboardApi';
import type { DashboardEnvelope } from '@/services/dashboardApi';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const [payload, setPayload] = useState<DashboardEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginFlash, setLoginFlash] = useState('');

  useEffect(() => {
    const msg = sessionStorage.getItem('login_flash');
    if (!msg) return;
    sessionStorage.removeItem('login_flash');
    setLoginFlash(msg);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      setPayload(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await dashboardApi.get();
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError(t('dashboard.load_error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const onAuthChange = () => {
      if (!cancelled && localStorage.getItem('access_token')) void run();
    };
    window.addEventListener('auth-change', onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener('auth-change', onAuthChange);
    };
  }, [authenticated, t]);

  if (!authenticated) {
    return (
      <Box p="md">
        <Text>{t('dashboard.need_login')}</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p="xl" className="flex justify-center">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="md">
        <Alert color="red" title={t('common.error')}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!payload) {
    return null;
  }

  const flashBanner = loginFlash ? (
    <Alert color="yellow" mb="md" onClose={() => setLoginFlash('')} withCloseButton>
      {loginFlash}
    </Alert>
  ) : null;

  if (payload.viewer_role === 'student' && payload.student) {
    return (
      <Box>
        {flashBanner}
        <StudentDashboard data={payload.student} />
      </Box>
    );
  }

  if ((payload.viewer_role === 'admin' || payload.viewer_role === 'teacher') && payload.staff) {
    return (
      <Box>
        {flashBanner}
        <AdminDashboard data={payload.staff} />
      </Box>
    );
  }

  return (
    <Box p="md">
      <Text color="red">{t('dashboard.unsupported_role')}</Text>
    </Box>
  );
};

export default Dashboard;
