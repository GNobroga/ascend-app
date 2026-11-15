import type { ComponentType, ReactNode } from 'react';
import type { UIMatch } from 'react-router';

export type RouteHandle = {
  crumb?: (match: UIMatch) => ReactNode;
  crumbIcon?: ComponentType<{ className?: string }>;
};

export type CrumbMatch = UIMatch<unknown, RouteHandle & Required<Pick<RouteHandle, 'crumb'>>>;

export const hasCrumb = (match: UIMatch): match is CrumbMatch =>
  typeof match.handle === 'object' &&
  match.handle !== null &&
  'crumb' in match.handle &&
  typeof match.handle.crumb === 'function';
