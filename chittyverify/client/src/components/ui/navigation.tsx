import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrustIndicator } from "./trust-indicator";
import { Search, Menu, X, Bell, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get current user data (demo user for now)
  const { data: user } = useQuery({
    queryKey: ["/api/users", "demo-user-1"],
    queryFn: () => Promise.resolve({
      id: "demo-user-1",
      username: "john.doe",
      email: "john.doe@example.com",
      trustScore: 85,
    }),
  });

  const navigationItems = [
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/upload", label: "Upload", active: location === "/upload" },
    { href: "/cases", label: "Cases", active: location.startsWith("/cases") },
    { href: "/analytics", label: "Analytics", active: location.startsWith("/analytics") },
  ];

  return (
    <nav className="relative z-50 bg-slate-900/95 backdrop-blur-sm shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group">
              <div className="w-10 h-10 rounded-lg gradient-verify flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
                <div className="verify-icon">
                  <i className="fas fa-check-circle text-white text-xl"></i>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ChittyVerify</h1>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`font-medium transition-colors ${
                    item.active
                      ? "text-primary-blue bg-blue-50"
                      : "text-gray-700 hover:text-primary-blue hover:bg-blue-50"
                  }`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="hidden md:flex items-center">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
              </Button>
            </div>

            {/* Trust Score & User */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrustIndicator score={user?.trustScore || 85} showLabel />
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || "John Doe"}
                  </p>
                  <p className="text-xs text-gray-600">Legal Professional</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-blue to-primary-navy rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(user?.username || "JD").charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      item.active
                        ? "text-primary-blue bg-blue-50"
                        : "text-gray-700"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between px-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.username || "John Doe"}
                    </p>
                    <p className="text-sm text-gray-600">Legal Professional</p>
                  </div>
                  <TrustIndicator score={user?.trustScore || 85} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
    </nav>
  );
}
