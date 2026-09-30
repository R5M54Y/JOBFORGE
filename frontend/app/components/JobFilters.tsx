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

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body p-4">
        <h5 className="card-title mb-4 fw-bold text-dark">Find Your Next Role</h5>
        <div className="row g-3">
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small fw-bold text-secondary text-uppercase">Keyword</label>
            <input
              className="form-control form-control-lg border-light bg-light"
              type="text"
              placeholder="Title, company..."
              value={filters.keyword}
              onChange={(e) => update('keyword', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small fw-bold text-secondary text-uppercase">Location</label>
            <input
              className="form-control form-control-lg border-light bg-light"
              type="text"
              placeholder="City, country..."
              value={filters.location}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small fw-bold text-secondary text-uppercase">Category</label>
            <input
              className="form-control form-control-lg border-light bg-light"
              type="text"
              placeholder="Marketing, Dev..."
              value={filters.category}
              onChange={(e) => update('category', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-12 col-lg-3">
            <label className="form-label small fw-bold text-secondary text-uppercase">Job Type</label>
            <select
              className="form-select form-select-lg border-light bg-light"
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
        </div>
      </div>
    </div>
  );
}
