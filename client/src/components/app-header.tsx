import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Case } from "@shared/schema";

interface AppHeaderProps {
  currentCase?: Case;
}

export default function AppHeader({ currentCase }: AppHeaderProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase();
  };

  const getDisplayName = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "User";
    return [firstName, lastName].filter(Boolean).join(" ");
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ChittyChronicle</h1>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <a className={`px-1 pb-1 text-sm font-medium ${
                  location === "/" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted hover:text-gray-900"
                }`}>
                  Cases
                </a>
              </Link>
              {currentCase && (
                <>
                  <Link href={`/timeline/${currentCase.id}`}>
                    <a className={`px-1 pb-1 text-sm font-medium ${
                      location.startsWith("/timeline") 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-muted hover:text-gray-900"
                    }`}>
                      Timeline
                    </a>
                  </Link>
                  <a href="#" className="text-muted hover:text-gray-900 px-1 pb-1 text-sm font-medium">
                    Documents
                  </a>
                  <a href="#" className="text-muted hover:text-gray-900 px-1 pb-1 text-sm font-medium">
                    Reports
                  </a>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {currentCase && (
              <div className="text-sm text-muted" data-testid="current-case-name">
                {currentCase.caseName}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600" data-testid="user-initials">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900" data-testid="user-name">
                {getDisplayName(user?.firstName, user?.lastName)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="text-muted hover:text-gray-900"
                data-testid="user-menu-button"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
