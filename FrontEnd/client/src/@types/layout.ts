export const LayoutTypes = {
  SimpleSideBar: 'SimpleSideBar',
  Auth: 'Auth',
} as const;

export type LayoutTypes = (typeof LayoutTypes)[keyof typeof LayoutTypes];
