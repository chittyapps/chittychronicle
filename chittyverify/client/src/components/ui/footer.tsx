import { Link } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const platformLinks = [
    { href: "/verify", label: "ChittyVerify" },
    { href: "/counsel", label: "ChittyCounsel" },
    { href: "/finance", label: "ChittyFinance" },
    { href: "/assets", label: "ChittyAssets" },
  ];

  const resourceLinks = [
    { href: "/docs", label: "Documentation" },
    { href: "/api", label: "API Reference" },
    { href: "/trust-algorithm", label: "Trust Algorithm" },
    { href: "/legal-framework", label: "Legal Framework" },
  ];

  const connectLinks = [
    { href: "/support", label: "Support" },
    { href: "/community", label: "Community" },
    { href: "https://github.com/chittyos", label: "GitHub", external: true },
    { href: "/status", label: "Status" },
  ];

  return (
    <footer className="bg-primary-navy text-white py-12 mt-16 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-noise opacity-20"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                <i className="fas fa-link text-primary-navy text-sm"></i>
              </div>
              <span className="text-xl font-bold">ChittyChain</span>
            </div>
            <p className="text-blue-200 text-sm mb-6">
              Legal evidence verification with blockchain integrity and AI-powered analysis.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com/chittyos" 
                className="text-blue-200 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-twitter text-lg"></i>
              </a>
              <a 
                href="https://linkedin.com/company/chittyos" 
                className="text-blue-200 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-linkedin text-lg"></i>
              </a>
              <a 
                href="https://github.com/chittyos" 
                className="text-blue-200 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-github text-lg"></i>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors cursor-pointer">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors cursor-pointer">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              {connectLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      className="hover:text-white transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>
                      <a className="hover:text-white transition-colors cursor-pointer">
                        {link.label}
                      </a>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-blue-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-200 text-sm mb-4 md:mb-0">
              © {currentYear} ChittyOS. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/privacy">
                <a className="text-blue-200 hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </a>
              </Link>
              <Link href="/terms">
                <a className="text-blue-200 hover:text-white transition-colors cursor-pointer">
                  Terms of Service
                </a>
              </Link>
              <Link href="/security">
                <a className="text-blue-200 hover:text-white transition-colors cursor-pointer">
                  Security
                </a>
              </Link>
              <span className="metallic-accent font-semibold">
                Never Sh*tty™
              </span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 pt-4 border-t border-blue-800">
          <p className="text-xs text-blue-300 text-center">
            ChittyChain is a blockchain-based evidence management platform. While we employ advanced 
            security measures and verification processes, users should consult with qualified legal 
            professionals regarding the admissibility and legal standing of evidence in their jurisdiction.
          </p>
        </div>
      </div>
    </footer>
  );
}
