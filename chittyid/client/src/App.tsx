import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import VerificationFlow from "@/pages/VerificationFlow";
import BusinessDashboard from "@/pages/BusinessDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/individuals" component={Landing} />
          <Route path="/businesses" component={Landing} />
          <Route path="/developers" component={Landing} />
          <Route path="/security" component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/verification" component={VerificationFlow} />
          <Route path="/business" component={BusinessDashboard} />
          <Route path="/individuals" component={Home} />
          <Route path="/businesses" component={BusinessDashboard} />
          <Route path="/developers" component={Home} />
          <Route path="/security" component={Home} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
