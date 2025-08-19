import { Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Case } from "@shared/schema";

interface AppHeaderProps {
  currentCase?: Case;
}

export default function AppHeader({ currentCase }: AppHeaderProps) {
  const [location] = useLocation();

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
                <span className={`px-1 pb-1 text-sm font-medium cursor-pointer ${
                  location === "/" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted hover:text-gray-900"
                }`}>
                  Cases
                </span>
              </Link>
              <Link href="/dashboard">
                <span className={`px-1 pb-1 text-sm font-medium cursor-pointer ${
                  location === "/dashboard" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted hover:text-gray-900"
                }`}>
                  Dashboard
                </span>
              </Link>
              <Link href="/timelines">
                <span className={`px-1 pb-1 text-sm font-medium cursor-pointer ${
                  location === "/timelines" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted hover:text-gray-900"
                }`}>
                  Timelines
                </span>
              </Link>
              {currentCase && (
                <>
                  <Link href={`/timeline/${currentCase.id}`}>
                    <span className={`px-1 pb-1 text-sm font-medium cursor-pointer ${
                      location.startsWith("/timeline") 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-muted hover:text-gray-900"
                    }`}>
                      Timeline
                    </span>
                  </Link>
                  <Link href={`/automation/${currentCase.id}`}>
                    <span className={`px-1 pb-1 text-sm font-medium cursor-pointer ${
                      location.startsWith("/automation") 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-muted hover:text-gray-900"
                    }`}>
                      Automation
                    </span>
                  </Link>
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
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                CC
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-900" data-testid="user-name">
                  ChittyChronicle User
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}