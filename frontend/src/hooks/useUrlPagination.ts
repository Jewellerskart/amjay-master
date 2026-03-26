import { useCallback } from 'react';
import { useUrlParams } from './useUrlParams';

const sanitizePage = (value: number) => {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
};

const sanitizeLimit = (value: number) => {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
};

export const useUrlPagination = () => {
  const { page, limit, setSearchParams } = useUrlParams();

  const setPage = useCallback(
    (nextPage: number) => {
      const targetPage = sanitizePage(nextPage);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('page', String(targetPage));
        return params;
      });
    },
    [setSearchParams],
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      const targetLimit = sanitizeLimit(nextLimit);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('limit', String(targetLimit));
        params.set('page', '1');
        return params;
      });
    },
    [setSearchParams],
  );

  return {
    page,
    limit,
    setPage,
    setLimit,
  };
};
