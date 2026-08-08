import { Navigate, Outlet } from 'react-router-dom';
import appConfig from '@/configs/app.config';
import useAuth from '@/hooks/useAuth';

const ProtectedRoute = () => {
  const { authenticated } = useAuth();

  if (!authenticated) {
    return <Navigate to={appConfig.unAuthenticatedEntryPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
