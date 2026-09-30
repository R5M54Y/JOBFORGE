'use client';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pageNumbers = [];
  // Display up to 5 page numbers around the current page for better UX
  const maxPagesToShow = 5;
  let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav aria-label="Page navigation" className="d-flex justify-content-center my-4">
      <ul className="pagination">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(1)} disabled={page <= 1}>&laquo;</button>
        </li>
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
        </li>
        {startPage > 1 && (
          <li className="page-item">
            <button className="page-link" onClick={() => onPageChange(1)}>1</button>
          </li>
        )}
        {startPage > 2 && <li className="page-item disabled"><span className="page-link">...</span></li>}

        {pageNumbers.map(pNum => (
          <li key={pNum} className={`page-item ${pNum === page ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(pNum)}>{pNum}</button>
          </li>
        ))}

        {endPage < totalPages - 1 && <li className="page-item disabled"><span className="page-link">...</span></li>}
        {endPage < totalPages && (
          <li className="page-item">
            <button className="page-link" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
          </li>
        )}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</button>
        </li>
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>&raquo;</button>
        </li>
      </ul>
    </nav>
  );
}
