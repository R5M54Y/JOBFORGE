'use client';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.8rem',
    border: '1px solid #ddd',
    borderRadius: 6,
    background: active ? '#0070f3' : '#fff',
    color: active ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: '0.9rem',
  });

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '2rem 0' }}>
      <button style={btnStyle(false)} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        &laquo; Prev
      </button>
      <span style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
        Page {page} of {totalPages}
      </span>
      <button style={btnStyle(false)} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next &raquo;
      </button>
    </div>
  );
}
