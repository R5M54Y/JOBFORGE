import { Metadata } from 'next';
import { getCategoriesWithCounts, getLocationsWithCounts } from '@/lib/job-service';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: `Browse Jobs - ${siteConfig.title}`,
  description: 'Explore all available remote jobs by category or location. Find your next opportunity.',
  alternates: {
    canonical: '/browse-jobs',
  },
};

export default async function BrowseJobsPage() {
  // Fetch categories and locations with counts
  let categories: Array<{ category: string; count: number }> = [];
  let locations: Array<{ location: string; count: number }> = [];

  try {
    [categories, locations] = await Promise.all([
      getCategoriesWithCounts(),
      getLocationsWithCounts(),
    ]);
  } catch (error) {
    console.error('Failed to load browse data:', error);
    // Continue with empty arrays - page will show empty state
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Browse Jobs</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', maxWidth: 600, margin: '0 auto' }}>
          Explore all available remote jobs by category or location. Find your next opportunity.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Categories Section */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '2px solid #0070f3', paddingBottom: '0.5rem' }}>
            Categories
          </h2>
          {categories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categories.map(({ category, count }) => (
                <a
                  key={category}
                  href={`/?category=${encodeURIComponent(category)}`}
                  style={{
                    padding: '1rem',
                    border: '1px solid #eee',
                    borderRadius: 6,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                  className="browse-link"
                >
                  <span style={{ fontWeight: 500 }}>{category}</span>
                  <span style={{ 
                    background: '#0070f3', 
                    color: '#fff', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: 12, 
                    fontSize: '0.9rem',
                    fontWeight: 600 
                  }}>
                    {count}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>No categories available.</p>
          )}
        </section>

        {/* Locations Section */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '2px solid #0070f3', paddingBottom: '0.5rem' }}>
            Locations
          </h2>
          {locations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locations.map(({ location, count }) => (
                <a
                  key={location}
                  href={`/?location=${encodeURIComponent(location)}`}
                  style={{
                    padding: '1rem',
                    border: '1px solid #eee',
                    borderRadius: 6,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                  className="browse-link"
                >
                  <span style={{ fontWeight: 500 }}>{location}</span>
                  <span style={{ 
                    background: '#0070f3', 
                    color: '#fff', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: 12, 
                    fontSize: '0.9rem',
                    fontWeight: 600 
                  }}>
                    {count}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>No locations available.</p>
          )}
        </section>
      </div>

      <style>{`
        .browse-link {
          display: flex;
        }
        .browse-link:hover {
          border-color: #0070f3;
          background-color: #f8f9fa;
          transform: translateX(4px);
        }
      `}</style>
    </main>
  );
}
