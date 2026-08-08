import { Navigate, Outlet } from 'react-router-dom';
import appConfig from '@/configs/app.config';
import useAuth from '@/hooks/useAuth';

const PublicRoute = () => {
  const { authenticated } = useAuth();

  if (authenticated) {
    return <Navigate to={appConfig.authenticatedEntryPath} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
