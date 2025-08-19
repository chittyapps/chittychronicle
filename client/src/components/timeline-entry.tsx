import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gavel, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Play
} from "lucide-react";
import type { TimelineEntry as TimelineEntryType } from "@shared/schema";

interface TimelineEntryProps {
  entry: TimelineEntryType;
  isLast: boolean;
  onEdit: () => void;
}

export default function TimelineEntry({ entry, isLast, onEdit }: TimelineEntryProps) {
  const getEntryIcon = () => {
    switch (entry.entryType) {
      case 'event':
        return Gavel;
      case 'task':
        return Clock;
      default:
        return FileText;
    }
  };

  const getEntryColor = () => {
    switch (entry.entryType) {
      case 'event':
        return 'blue';
      case 'task':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
      case 'occurred':
        return 'green';
      case 'in_progress':
      case 'upcoming':
        return 'yellow';
      case 'blocked':
      case 'missed':
        return 'red';
      case 'pending':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'low':
        return 'bg-orange-400';
      case 'unverified':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const EntryIcon = getEntryIcon();
  const entryColor = getEntryColor();
  const status = entry.entryType === 'event' ? entry.eventStatus : entry.taskStatus;
  const statusColor = getStatusColor(status);
  const subtype = entry.entryType === 'event' ? entry.eventSubtype : entry.taskSubtype;

  return (
    <div className="relative flex items-start space-x-4" data-testid={`timeline-entry-${entry.id}`}>
      {/* Timeline dot */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
        entryColor === 'blue' ? 'bg-blue-100' :
        entryColor === 'purple' ? 'bg-purple-100' :
        'bg-gray-100'
      }`}>
        <EntryIcon className={`w-5 h-5 ${
          entryColor === 'blue' ? 'text-blue-600' :
          entryColor === 'purple' ? 'text-purple-600' :
          'text-gray-600'
        }`} />
      </div>

      {/* Entry content */}
      <div className="flex-1 min-w-0">
        <Card className={`border ${
          entryColor === 'blue' ? 'bg-blue-50 border-blue-200' :
          entryColor === 'purple' ? 'bg-purple-50 border-purple-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Entry type and status badges */}
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={`${
                    entryColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                    entryColor === 'purple' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {entry.entryType.toUpperCase()}
                  </Badge>
                  
                  {subtype && (
                    <Badge className={`${
                      statusColor === 'green' ? 'bg-green-100 text-green-800' :
                      statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      statusColor === 'red' ? 'bg-red-100 text-red-800' :
                      statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {subtype.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}

                  {status && (
                    <Badge className={`${
                      statusColor === 'green' ? 'bg-green-100 text-green-800' :
                      statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      statusColor === 'red' ? 'bg-red-100 text-red-800' :
                      statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Entry title and description */}
                <h4 className="text-sm font-semibold text-gray-900 mb-1" data-testid="entry-description">
                  {entry.description}
                </h4>
                
                {entry.detailedNotes && (
                  <p className="text-sm text-gray-600 mb-3" data-testid="entry-notes">
                    {entry.detailedNotes}
                  </p>
                )}

                {/* Entry metadata */}
                <div className="flex items-center space-x-4 text-xs text-muted">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(entry.date)}
                  </span>
                  
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {entry.createdBy}
                  </span>

                  {entry.chittyId && (
                    <span className="flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {entry.chittyId}
                    </span>
                  )}

                  {entry.assignedTo && (
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      Assigned: {entry.assignedTo}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Confidence indicator and actions */}
              <div className="flex items-center space-x-2">
                <span 
                  className={`w-3 h-3 rounded-full ${getConfidenceColor(entry.confidenceLevel)}`}
                  title={`${entry.confidenceLevel} confidence`}
                  data-testid="confidence-indicator"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-muted hover:text-gray-600"
                  data-testid="entry-menu-button"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
