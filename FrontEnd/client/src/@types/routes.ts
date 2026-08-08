import { type ComponentType } from 'react';

export type NavPosition = 'main' | 'sub';

export type NavMeta = {
  labelKey: string;
  position: NavPosition;
  order?: number;
  icon?: ComponentType<{ size?: number }>;
  groupKey?: string;
};

export type NavGroup = {
  key: string;
  labelKey: string;
  icon: ComponentType<{ size?: number }>;
  order?: number;
};

export type RouteConfig = {
  key: string;
  path: string;
  component: ComponentType;
  authority: string[];
  nav?: NavMeta;
};

export type Routes = RouteConfig[];
