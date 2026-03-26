import { useUrlPagination } from '@hooks/useUrlPagination';

type TablePaginationProps = {
  total: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  useUrlSync?: boolean; // default: true when handlers are missing
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildPageList = (current: number, totalPages: number, maxVisible = 5) => {
  const pages: Array<number | 'left-ellipsis' | 'right-ellipsis'> = [];
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);

  let start = Math.max(2, current - 1);
  let end = Math.min(totalPages - 1, current + 1);

  const middleSlots = maxVisible - 2;
  while (end - start + 1 > middleSlots) {
    if (current > totalPages / 2) start += 1;
    else end -= 1;
  }
  while (end - start + 1 < middleSlots) {
    if (start > 2) start -= 1;
    else if (end < totalPages - 1) end += 1;
    else break;
  }

  if (start > 2) pages.push('left-ellipsis');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('right-ellipsis');

  pages.push(totalPages);
  return pages;
};

export const TablePagination = ({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100], useUrlSync = true }: TablePaginationProps) => {
  const urlPagination = useUrlPagination();

  const useUrl = useUrlSync || !onPageChange || !onPageSizeChange;
  const effectivePage = useUrl ? urlPagination.page : (page ?? 1);
  const effectivePageSize = useUrl ? urlPagination.limit : (pageSize ?? 10);

  const safePageSize = effectivePageSize > 0 ? effectivePageSize : 10;
  const totalPages = Math.max(1, Math.ceil((total || 0) / safePageSize));
  const currentPage = clamp(effectivePage, 1, totalPages);
  const pages = buildPageList(currentPage, totalPages, 5);

  const handlePageChange = (nextPage: number) => {
    if (useUrl) {
      urlPagination.setPage(clamp(nextPage, 1, totalPages));
    } else {
      onPageChange?.(clamp(nextPage, 1, totalPages));
    }
  };

  const handlePageSizeChange = (nextSize: number) => {
    const targetSize = Number(nextSize) || 10;
    if (useUrl) {
      urlPagination.setLimit(targetSize);
    } else {
      onPageSizeChange?.(targetSize);
      onPageChange?.(1);
    }
  };

  return (
    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
      <div className="d-flex align-items-center flex-wrap gap-2">
        <span className="text-muted small">Show</span>
        <select className="form-control form-control-sm mx-2" value={safePageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} style={{ width: 60, minHeight: '10px' }} aria-label="Rows per page">
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="text-muted small">per page</span>
        <span className="text-muted small">| Total {total}</span>
      </div>

      <div className="d-flex align-items-center flex-wrap gap-2">
        <span className="text-muted small mr-2">
          Page {currentPage} of {totalPages}
        </span>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button className="page-link d-flex align-items-center justify-content-around" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
              <i className="fa fa-chevron-left" aria-hidden="true" />
            </button>
          </li>
          {pages.map((p, idx) =>
            typeof p === 'number' ? (
              <li key={`${p}-${idx}`} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(p)}>
                  {p}
                </button>
              </li>
            ) : (
              <li key={`${p}-${idx}`} className="page-item disabled">
                <span className="page-link">...</span>
              </li>
            ),
          )}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button className="page-link d-flex align-items-center justify-content-around" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
              <i className="fa fa-chevron-right" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

type UrlTablePaginationProps = {
  total: number;
  pageSizeOptions?: number[];
};

export const UrlTablePagination = ({ total, pageSizeOptions }: UrlTablePaginationProps) => {
  return <TablePagination total={total} pageSizeOptions={pageSizeOptions} />;
};
