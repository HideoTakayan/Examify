import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import appConfig from '@/configs/app.config';
import { protectedRoutes, publicRoutes } from '@/configs/routes.config';
import AppRoute from '@/route/AppRoute';
import AuthorityGuard from '@/route/AuthorityGuard';
import ProtectedRoute from '@/route/ProtectedRoute';
import PublicRoute from '@/route/PublicRoute';
import useAuth from '@/hooks/useAuth';

const { authenticatedEntryPath } = appConfig;

const AllRoutes = () => {
	const { userAuthority } = useAuth();

	return (
		<Routes>
			<Route path="/" element={<ProtectedRoute />}>
				<Route path="/" element={<Navigate replace to={authenticatedEntryPath} />} />
				{protectedRoutes.map((route, index) => (
					<Route
						key={route.key + index}
						path={route.path}
						element={
							<AuthorityGuard userAuthority={userAuthority} authority={route.authority}>
								<AppRoute routeKey={route.key} component={route.component} />
							</AuthorityGuard>
						}
					/>
				))}
				<Route path="*" element={<Navigate replace to="/" />} />
			</Route>
			<Route path="/" element={<PublicRoute />}>
				{publicRoutes.map((route) => (
					<Route
						key={route.path}
						path={route.path}
						element={<AppRoute routeKey={route.key} component={route.component} />}
					/>
				))}
			</Route>
		</Routes>
	);
};

const Views = () => (
	<Suspense fallback={<LoadingScreen />}>
		<AllRoutes />
	</Suspense>
);

export default Views;
