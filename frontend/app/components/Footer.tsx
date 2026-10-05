import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';

export function Footer() {
  return (
    <footer id="site-footer" className="bg-dark text-light py-4 mt-5">
      <div className="container">
        <div className="row">
          <div className="col-md-6 mb-3 mb-md-0">
            <h5 className="mb-3 text-white">{siteConfig.title}</h5>
            <p className="text-muted small">
              Find remote jobs from multiple sources in one place. Your gateway to remote work opportunities worldwide.
            </p>
          </div>
          <div className="col-md-3 mb-3 mb-md-0">
            <h6 className="mb-3 text-white">Quick Links</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/" className="text-white-50 text-decoration-none small hover-text-white">
                  Home
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/browse-jobs" className="text-white-50 text-decoration-none small hover-text-white">
                  Browse Jobs
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-md-3">
            <h6 className="mb-3 text-white">Legal</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/privacy-policy" className="text-white-50 text-decoration-none small hover-text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <hr className="my-4 border-secondary" />
        <div className="row">
          <div className="col-12 text-center">
            <p className="text-muted small mb-0">
              &copy; {new Date().getFullYear()} {siteConfig.title}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
