import { Button } from "@/components/ui/button";
import { Filter, Plus } from "lucide-react";
import EvidenceTable from "@/components/evidence-table";
import CaseSidebar from "@/components/case-sidebar";
import TrustTimeline from "@/components/trust-timeline";
import MintingEligibility from "@/components/minting-eligibility";

import { useQuery } from "@tanstack/react-query";

export default function EvidenceManagement() {
  const { data: evidence } = useQuery({
    queryKey: ['/api/evidence']
  });

  const sampleEvidence = evidence && Array.isArray(evidence) && evidence.length > 0 ? evidence[0] : null;

  return (
    <section className="py-24 bg-institutional-900/30 min-h-screen">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Dashboard Header */}
          <div className="col-span-12 mb-12">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-legal text-4xl text-institutional-50 mb-2">Evidence Management</h2>
                <p className="text-institutional-400">Comprehensive forensic evidence tracking and analysis</p>
              </div>
              <div className="flex space-x-4">
                <Button 
                  variant="outline"
                  className="bg-institutional-800 hover:bg-institutional-700 text-institutional-300 border-institutional-700"
                  data-testid="button-filter"
                >
                  <Filter className="mr-2 w-4 h-4" />
                  Filter
                </Button>
                <Button 
                  className="bg-legal-gold-500 hover:bg-legal-gold-600 text-institutional-950"
                  data-testid="button-add-evidence"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add Evidence
                </Button>
              </div>
            </div>
          </div>
          
          {/* Trust Systems Demo */}
          {sampleEvidence && (
            <div className="col-span-12 mb-8">
              <div className="grid grid-cols-2 gap-8">
                <TrustTimeline evidence={sampleEvidence} />
                <MintingEligibility evidenceId={sampleEvidence.id} />
              </div>
            </div>
          )}

          {/* Evidence Grid */}
          <div className="col-span-8">
            <EvidenceTable />
          </div>
          
          {/* Sidebar - Case Information */}
          <div className="col-span-4">
            <CaseSidebar />
          </div>
        </div>
      </div>
    </section>
  );
}
