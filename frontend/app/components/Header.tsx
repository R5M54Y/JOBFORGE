'use client';

import { siteConfig } from '@/lib/siteConfig';
import Link from 'next/link';

export function Header() {
  return (
    <header className="navbar navbar-expand-md navbar-light bg-white border-bottom mb-4 py-3">
      <div className="container">
        <Link href="/" className="navbar-brand fw-bold fs-4 text-primary">
          {siteConfig.title}
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item">
              <Link href="/" className="nav-link fw-medium text-secondary">
                Jobs
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/browse-jobs" className="nav-link fw-medium text-secondary">
                Browse
              </Link>
            </li>
            <li className="nav-item ms-md-3 mt-3 mt-md-0">
              <a
                href="https://remotive.com/join?via=jobforge"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary fw-bold px-4 rounded-pill"
              >
                Sign Up
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
