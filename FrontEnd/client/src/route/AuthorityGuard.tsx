import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export type AuthorityGuardProps = {
  authority?: string[];
  userAuthority?: string[] | string;
  children: ReactNode;
};

const normalizeAuthority = (authority?: string[] | string) => {
  if (!authority) {
    return [];
  }
  return Array.isArray(authority) ? authority : [authority];
};

const AuthorityGuard = ({ authority, userAuthority, children }: AuthorityGuardProps) => {
  const required = normalizeAuthority(authority);
  if (required.length === 0) {
    return <>{children}</>;
  }

  const userRoles = normalizeAuthority(userAuthority);
  const isAllowed = required.some((role) => userRoles.includes(role));

  if (!isAllowed) {
    return <Navigate to="/main" replace />;
  }

  return <>{children}</>;
};

export default AuthorityGuard;
