export default function NotFound() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ marginTop: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#333', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#666', marginBottom: '1rem' }}>Job Not Found</h2>
        <p style={{ color: '#999', marginBottom: '2rem' }}>
          The job you are looking for does not exist or has been removed.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#0070f3',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to Job Listings
        </a>
      </div>
    </main>
  );
}
