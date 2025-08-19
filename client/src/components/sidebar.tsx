import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, FileText, Clock, AlertTriangle, Calendar } from "lucide-react";
import type { Case, TimelineEntry } from "@shared/schema";

interface SidebarProps {
  caseDetails: Case;
  deadlines: TimelineEntry[];
  onCreateEntry: () => void;
}

export default function Sidebar({ caseDetails, deadlines, onCreateEntry }: SidebarProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const getDeadlineStatus = (entry: TimelineEntry) => {
    if (!entry.date) return { color: "gray", icon: Clock };
    
    const dueDate = new Date(entry.date);
    const now = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return { color: "red", icon: AlertTriangle, text: "Overdue" };
    } else if (daysDiff <= 7) {
      return { color: "yellow", icon: AlertTriangle, text: `${daysDiff} days left` };
    } else {
      return { color: "green", icon: Clock, text: `${daysDiff} days left` };
    }
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Case Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Case Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide">
              Case Number
            </label>
            <p className="text-sm font-medium text-gray-900" data-testid="case-number">
              {caseDetails.caseNumber}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide">
              Jurisdiction
            </label>
            <p className="text-sm text-gray-700" data-testid="case-jurisdiction">
              {caseDetails.jurisdiction || "Not specified"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide">
              Filing Date
            </label>
            <p className="text-sm text-gray-700" data-testid="case-filing-date">
              {formatDate(caseDetails.filingDate)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide">
              Trial Date
            </label>
            <p className="text-sm text-gray-700" data-testid="case-trial-date">
              {formatDate(caseDetails.trialDate)}
            </p>
          </div>
          {caseDetails.discoveryDeadline && (
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide">
                Discovery Deadline
              </label>
              <p className={`text-sm ${
                isOverdue(caseDetails.discoveryDeadline) 
                  ? "text-red-600 font-medium" 
                  : "text-gray-700"
              }`} data-testid="case-discovery-deadline">
                {formatDate(caseDetails.discoveryDeadline)}
                {isOverdue(caseDetails.discoveryDeadline) && (
                  <span className="ml-1">⚠️</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onCreateEntry}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium transition-colors duration-200"
            data-testid="add-timeline-entry-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Timeline Entry
          </Button>
          <Button
            variant="secondary"
            className="w-full bg-secondary hover:bg-green-700 text-white font-medium transition-colors duration-200"
            data-testid="upload-document-button"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button
            variant="outline"
            className="w-full font-medium transition-colors duration-200"
            data-testid="generate-report-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.slice(0, 5).map((deadline) => {
                const status = getDeadlineStatus(deadline);
                const StatusIcon = status.icon;
                
                return (
                  <div
                    key={deadline.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      status.color === 'red' 
                        ? 'bg-red-50 border-red-200' 
                        : status.color === 'yellow'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                    data-testid={`deadline-${deadline.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        status.color === 'red'
                          ? 'text-red-900'
                          : status.color === 'yellow'
                          ? 'text-yellow-900'
                          : 'text-green-900'
                      }`}>
                        {deadline.description}
                      </p>
                      <p className={`text-xs ${
                        status.color === 'red'
                          ? 'text-red-600'
                          : status.color === 'yellow'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        Due: {deadline.date ? new Date(deadline.date).toLocaleDateString() : 'No date'}
                      </p>
                      {status.text && (
                        <p className={`text-xs font-medium ${
                          status.color === 'red'
                            ? 'text-red-600'
                            : status.color === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}>
                          {status.text}
                        </p>
                      )}
                    </div>
                    <div className={`${
                      status.color === 'red'
                        ? 'text-red-600'
                        : status.color === 'yellow'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
