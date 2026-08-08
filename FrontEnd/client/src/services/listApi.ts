import apiClient from './apiClient';
import {
  type PaginatedList,
  type PaginationMeta,
  unwrapPaginatedData,
  buildPaginationMeta,
  DEFAULT_PAGE_SIZE,
} from '@/utils/pagination';

export type { PaginatedList, PaginationMeta };

export type ListQueryParams = {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  [key: string]: string | number | undefined;
};

export async function fetchPaginatedList<T>(
  path: string,
  params: ListQueryParams = {}
): Promise<PaginatedList<T>> {
  const query: Record<string, string> = {};
  if (params.limit != null) query.limit = String(params.limit);
  if (params.offset != null) query.offset = String(params.offset);
  if (params.page != null) query.page = String(params.page);
  for (const [key, value] of Object.entries(params)) {
    if (key === 'limit' || key === 'offset' || key === 'page') continue;
    if (value !== undefined && value !== '') query[key] = String(value);
  }

  const res = await apiClient.get<{ success: boolean; data: unknown }>(path, { params: query });
  return unwrapPaginatedData<T>(res.data.data);
}

/** Lấy toàn bộ (tối đa maxLimit) cho dropdown/picker */
export async function fetchAllListItems<T>(
  path: string,
  extraParams?: Record<string, string>,
  maxLimit = 500
): Promise<T[]> {
  const result = await fetchPaginatedList<T>(path, {
    limit: maxLimit,
    offset: 0,
    ...extraParams,
  });
  return result.items;
}

export { unwrapPaginatedData, buildPaginationMeta, DEFAULT_PAGE_SIZE };
