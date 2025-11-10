import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// No authentication needed
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import ModernHome from "@/pages/modern-home";
import Timeline from "@/pages/timeline";
import Timelines from "@/pages/timelines";
import Communications from "@/pages/communications";
import Automation from "@/pages/automation";
import Dashboard from "@/pages/dashboard";
import ChittyEcosystem from "@/pages/chitty-ecosystem";
import EvidenceOrchestrator from "@/pages/evidence-orchestrator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ModernHome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/timelines" component={Timelines} />
      <Route path="/timeline/:caseId" component={Timeline} />
      <Route path="/communications/:caseId" component={Communications} />
      <Route path="/automation/:caseId" component={Automation} />
      <Route path="/ecosystem" component={ChittyEcosystem} />
      <Route path="/evidence/orchestrator" component={EvidenceOrchestrator} />
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
