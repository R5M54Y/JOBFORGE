'use client';

interface Props {
  filters: {
    keyword: string;
    location: string;
    category: string;
    employmentType: string;
  };
  onChange: (filters: Props['filters']) => void;
}

export function JobFilters({ filters, onChange }: Props) {
  const update = (field: string, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '0.9rem',
    flex: '1 1 200px',
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <input
        style={inputStyle}
        type="text"
        placeholder="Keyword (min 2 chars)"
        value={filters.keyword}
        onChange={(e) => update('keyword', e.target.value)}
      />
      <input
        style={inputStyle}
        type="text"
        placeholder="Location"
        value={filters.location}
        onChange={(e) => update('location', e.target.value)}
      />
      <input
        style={inputStyle}
        type="text"
        placeholder="Category"
        value={filters.category}
        onChange={(e) => update('category', e.target.value)}
      />
      <select
        style={inputStyle}
        value={filters.employmentType}
        onChange={(e) => update('employmentType', e.target.value)}
      >
        <option value="">All types</option>
        <option value="full-time">Full-time</option>
        <option value="part-time">Part-time</option>
        <option value="contract">Contract</option>
        <option value="freelance">Freelance</option>
      </select>
    </div>
  );
}
