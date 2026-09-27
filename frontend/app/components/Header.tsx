'use client';

import { siteConfig } from '@/lib/siteConfig';
import Link from 'next/link';

export function Header() {
  return (
    <header style={{ 
      borderBottom: '1px solid #eee', 
      marginBottom: '2rem',
      padding: '1rem 0'
    }}>
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '0 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <Link 
            href="/" 
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            {siteConfig.title}
          </Link>
        </div>
        
        <nav style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Link 
            href="/" 
            style={{ 
              textDecoration: 'none', 
              color: '#666',
              fontWeight: 500
            }}
          >
            Jobs
          </Link>
          <Link 
            href="/browse-jobs" 
            style={{ 
              textDecoration: 'none', 
              color: '#666',
              fontWeight: 500
            }}
          >
            Browse
          </Link>
          <a
            href="https://remotive.com/join?via=jobforge"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1rem',
              background: '#0070f3',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            Sign Up
          </a>
        </nav>
      </div>
    </header>
  );
}
