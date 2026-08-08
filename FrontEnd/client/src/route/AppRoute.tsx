import { type ComponentType } from 'react';

export type AppRouteProps = {
  component: ComponentType;
  routeKey?: string;
};

const AppRoute = ({ component: Component }: AppRouteProps) => {
  return <Component />;
};

export default AppRoute;
