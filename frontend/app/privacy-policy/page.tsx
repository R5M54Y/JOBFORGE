import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Remote Workers',
  description: 'Privacy Policy for Remote Workers job board',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container py-5" id="privacy-policy-page">
      <div className="mb-4">
        <Link href="/" className="btn btn-link text-decoration-none p-0 text-primary fw-medium">
          &larr; Back to home
        </Link>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-lg-5">
          <h1 className="display-6 fw-bold mb-4 text-dark">Privacy Policy</h1>
          <p className="text-muted mb-4">
            <strong>Last Updated:</strong> October 5, 2026
          </p>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">1. Introduction</h2>
            <p className="text-muted lh-lg">
              Welcome to Remote Workers (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you visit our website and use our job board services.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">2. Information We Collect</h2>
            <h3 className="h5 fw-semibold text-dark mb-2">2.1 Automatically Collected Information</h3>
            <p className="text-muted lh-lg">
              When you visit our website, we automatically collect certain information about your device, 
              including information about your web browser, IP address, time zone, and some of the cookies 
              that are installed on your device. We use this information to improve our services and user experience.
            </p>
            
            <h3 className="h5 fw-semibold text-dark mb-2 mt-4">2.2 Job Search Information</h3>
            <p className="text-muted lh-lg">
              We collect information about your job searches, including keywords, locations, categories, and 
              employment types you search for. This helps us provide relevant job recommendations.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">3. How We Use Your Information</h2>
            <p className="text-muted lh-lg">We use the information we collect to:</p>
            <ul className="text-muted lh-lg">
              <li>Provide, operate, and maintain our job board services</li>
              <li>Improve, personalize, and expand our services</li>
              <li>Understand and analyze how you use our website</li>
              <li>Develop new features and functionality</li>
              <li>Display relevant job listings based on your search criteria</li>
              <li>Monitor and analyze usage and trends to improve user experience</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">4. Third-Party Job Sources</h2>
            <p className="text-muted lh-lg">
              Remote Workers aggregates job listings from various third-party sources including Jobicy and Remotive. 
              When you click &quot;Apply&quot; on a job listing, you will be redirected to the employer&apos;s website or the 
              original job source. We are not responsible for the privacy practices of these external sites. 
              We encourage you to read their privacy policies before submitting any personal information.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">5. Cookies and Tracking Technologies</h2>
            <p className="text-muted lh-lg">
              We use cookies and similar tracking technologies to track activity on our website and store certain 
              information. Cookies are files with small amounts of data that are sent to your browser from a website 
              and stored on your device. You can instruct your browser to refuse all cookies or to indicate when a 
              cookie is being sent.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">6. Third-Party Analytics and Advertising</h2>
            <p className="text-muted lh-lg">
              We use third-party services for analytics and advertising purposes. These services may use cookies, 
              web beacons, and other tracking technologies to collect information about your use of our website. 
              This includes:
            </p>
            <ul className="text-muted lh-lg">
              <li><strong>Analytics:</strong> We use analytics services to understand how users interact with our website</li>
              <li><strong>Advertising:</strong> We display advertisements from third-party networks to support our services</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">7. Data Security</h2>
            <p className="text-muted lh-lg">
              We implement appropriate technical and organizational security measures to protect your information. 
              However, please note that no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">8. Your Rights</h2>
            <p className="text-muted lh-lg">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="text-muted lh-lg">
              <li>The right to access your personal information</li>
              <li>The right to request correction of inaccurate information</li>
              <li>The right to request deletion of your information</li>
              <li>The right to object to our processing of your information</li>
              <li>The right to data portability</li>
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted lh-lg">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect 
              personal information from children under 18. If you believe we have collected information from a 
              child under 18, please contact us immediately.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-muted lh-lg">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date at the top of this policy.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="h4 fw-bold text-dark mb-3">11. Contact Us</h2>
            <p className="text-muted lh-lg">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us 
              through our website.
            </p>
          </section>

          <div className="alert alert-light border mt-5" role="alert">
            <p className="mb-0 small text-muted">
              <strong>Note:</strong> By using Remote Workers, you acknowledge that you have read and understood 
              this Privacy Policy and agree to be bound by its terms.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
