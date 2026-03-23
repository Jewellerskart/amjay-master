import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const getFiscalYearStart = (today: Date) => {
  const month = today.getMonth() + 1;
  return month < 4 ? new Date(today.getFullYear() - 1, 3, 2) : new Date(today.getFullYear(), 3, 2);
};

export const useUrlParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const fiscalYearStart = useMemo(() => getFiscalYearStart(today), [today]);

  const startDateDefault = useMemo(() => fiscalYearStart.toISOString().split('T')[0], [fiscalYearStart]);
  const endDateDefault = useMemo(() => today.toISOString().split('T')[0], [today]);

  const query = useMemo(() => {
    const params = Object.fromEntries(searchParams);
    return {
      params,
      limit: Number(params.limit) || 10,
      page: Number(params.page) || 1,
      order: params.order || 'DESC',
      startDate: params.startDate || startDateDefault,
      endDate: params.endDate || endDateDefault,
    };
  }, [endDateDefault, searchParams, startDateDefault]);

  return {
    limit: query.limit,
    page: query.page,
    order: query.order,
    params: query.params,
    startDate: query.startDate,
    endDate: query.endDate,
    searchParams,
    setSearchParams,
  };
};
