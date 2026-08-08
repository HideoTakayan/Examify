import { AppShell } from '@mantine/core';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchSession } from '@/services/authApi';
import { redirectToPasswordChange } from '@/services/redirectToPasswordChange';
import Sidebar from '@/components/SideBar/SideBar';
import { NavbarNested } from '@/components/NavBar/NavbarNested';
import Views from '@/components/Layout/Views';
import { useState } from 'react';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import useAuth from '@/hooks/useAuth';

const DefaultLayout = () => {
  useSessionGuard();
  const { authenticated, accessToken } = useAuth();
  const { pathname } = useLocation();
  const isExamMode = pathname.startsWith('/exam/');
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);

  useEffect(() => {
    if (!authenticated || !accessToken) return;
    if (pathname.startsWith('/change-password-required')) return;
    void fetchSession()
      .then((session) => {
        if (session.requires_password_change) {
          redirectToPasswordChange();
        }
      })
      .catch(() => {
        /* 401 / mất phiên → interceptor */
      });
  }, [accessToken, authenticated, pathname]);

  if (isExamMode) {
    return (
      <AppShell padding={0}>
        <AppShell.Main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Views />
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell
      navbar={{
        width: navbarCollapsed ? 72 : 260,
        /* md (~992px) khiến navbar chuyển overlay full-width rất sớm; xs chỉ ẩn sidebar dưới ~576px */
        breakpoint: 'xs',
      }}
      header={{
        height: 60,
      }}
      padding="md"
    >
      <AppShell.Navbar
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderRight: '1px solid #E4E4E7',
          background: '#FAFAFA',
        }}
      >
        <NavbarNested collapsed={navbarCollapsed} onCollapsedChange={setNavbarCollapsed} />
      </AppShell.Navbar>

      <AppShell.Header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
        }}
      >
        <Sidebar />
      </AppShell.Header>

      <AppShell.Main
        style={{
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#F4F4F5',
        }}
      >
        <Views />
      </AppShell.Main>
    </AppShell>
  );
};
export default DefaultLayout;
