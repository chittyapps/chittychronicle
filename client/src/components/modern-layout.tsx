import { ReactNode } from "react";
import ModernHeader from "@/components/modern-header";
import ModernSidebar from "@/components/modern-sidebar";

interface ModernLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function ModernLayout({ children, showSidebar = true }: ModernLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernHeader />
      <div className="flex">
        {showSidebar && <ModernSidebar />}
        <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} p-6`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}