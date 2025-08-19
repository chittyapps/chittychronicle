import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { 
  Share2, 
  Mail, 
  Eye, 
  Download, 
  Shield, 
  Clock, 
  Users, 
  Copy,
  CalendarIcon,
  Key,
  CheckCircle,
  ExternalLink,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuickShareButtonProps {
  evidenceId: string;
  evidenceTitle: string;
  evidenceType: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
}

interface ShareFormData {
  recipientEmail: string;
  recipientChittyId?: string;
  accessLevel: "view" | "download" | "verify";
  expirationDate?: Date;
  maxAccess?: number;
  requirePin: boolean;
  securityPin?: string;
  personalMessage?: string;
}

interface ShareResponse {
  shareId: string;
  shareUrl: string;
  expiresAt?: string;
  accessLevel: string;
  securityPin?: string;
}

export function QuickShareButton({
  evidenceId,
  evidenceTitle,
  evidenceType,
  size = "default",
  variant = "default"
}: QuickShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareFormData>({
    recipientEmail: "",
    accessLevel: "view",
    requirePin: false
  });
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shareEvidenceMutation = useMutation({
    mutationFn: async (data: ShareFormData): Promise<ShareResponse> => {
      const response = await apiRequest('/api/evidence/share', 'POST', {
        evidenceId,
        ...data,
        expiresAt: expirationDate?.toISOString(),
      });
      return response;
    },
    onSuccess: (response: ShareResponse) => {
      toast({
        title: "Evidence Shared Successfully",
        description: `Secure link generated with ${response.accessLevel} access`,
      });
      
      // Copy share URL to clipboard
      navigator.clipboard.writeText(response.shareUrl);
      
      // Invalidate evidence queries to refresh share count
      queryClient.invalidateQueries({ queryKey: ['/api/evidence'] });
      
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Sharing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setShareData({
      recipientEmail: "",
      accessLevel: "view",
      requirePin: false
    });
    setExpirationDate(undefined);
  };

  const handleShare = () => {
    if (!shareData.recipientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter the recipient's email address",
        variant: "destructive",
      });
      return;
    }

    if (shareData.requirePin && !shareData.securityPin) {
      toast({
        title: "Security PIN Required",
        description: "Please set a 4-6 digit security PIN",
        variant: "destructive",
      });
      return;
    }

    shareEvidenceMutation.mutate(shareData);
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setShareData(prev => ({ ...prev, securityPin: pin }));
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case "view": return <Eye className="w-4 h-4" />;
      case "download": return <Download className="w-4 h-4" />;
      case "verify": return <Shield className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getAccessLevelDescription = (level: string) => {
    switch (level) {
      case "view": return "View evidence details and verification status";
      case "download": return "View and download evidence files";
      case "verify": return "Full verification access including ChittyBeacon data";
      default: return "Basic viewing access";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="flex items-center gap-2"
          data-testid="button-quick-share"
        >
          <Share2 className="w-4 h-4" />
          {size !== "sm" && "Quick Share"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="professional-modal max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-gradient-primary">Share Evidence</span>
              <p className="text-sm text-slate-400 font-normal">Securely share with authorized parties</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Evidence Info */}
          <Card className="evidence-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-card flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary-blue" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{evidenceTitle}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Type: {evidenceType}</span>
                    <span>ID: {evidenceId}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Recipient Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipientEmail">Email Address *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  className="input-professional"
                  value={shareData.recipientEmail}
                  onChange={(e) => setShareData(prev => ({
                    ...prev,
                    recipientEmail: e.target.value
                  }))}
                  data-testid="input-recipient-email"
                />
              </div>
              
              <div>
                <Label htmlFor="recipientChittyId">ChittyID (Optional)</Label>
                <Input
                  id="recipientChittyId"
                  placeholder="CH-2025-VER-1234-A"
                  className="input-professional"
                  value={shareData.recipientChittyId || ""}
                  onChange={(e) => setShareData(prev => ({
                    ...prev,
                    recipientChittyId: e.target.value
                  }))}
                  data-testid="input-recipient-chittyid"
                />
              </div>
            </div>
          </div>

          {/* Access Level */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Access Permissions</h3>
            
            <div>
              <Label htmlFor="accessLevel">Access Level</Label>
              <Select
                value={shareData.accessLevel}
                onValueChange={(value: "view" | "download" | "verify") => 
                  setShareData(prev => ({ ...prev, accessLevel: value }))
                }
              >
                <SelectTrigger className="input-professional" data-testid="select-access-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>View Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>View & Download</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="verify">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Full Verification</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">
                {getAccessLevelDescription(shareData.accessLevel)}
              </p>
            </div>
          </div>

          {/* Security & Expiration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Security Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expiration Date */}
              <div>
                <Label>Expiration Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="input-professional justify-start text-left font-normal"
                      data-testid="button-expiration-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border border-border">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Max Access Count */}
              <div>
                <Label htmlFor="maxAccess">Max Access Count (Optional)</Label>
                <Input
                  id="maxAccess"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Unlimited"
                  className="input-professional"
                  value={shareData.maxAccess || ""}
                  onChange={(e) => setShareData(prev => ({
                    ...prev,
                    maxAccess: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  data-testid="input-max-access"
                />
              </div>
            </div>

            {/* Security PIN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="requirePin">Require Security PIN</Label>
                <Switch
                  id="requirePin"
                  checked={shareData.requirePin}
                  onCheckedChange={(checked) => setShareData(prev => ({
                    ...prev,
                    requirePin: checked,
                    securityPin: checked ? prev.securityPin : undefined
                  }))}
                  data-testid="switch-require-pin"
                />
              </div>
              
              {shareData.requirePin && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 4-6 digit PIN"
                    className="input-professional"
                    value={shareData.securityPin || ""}
                    onChange={(e) => setShareData(prev => ({
                      ...prev,
                      securityPin: e.target.value
                    }))}
                    maxLength={6}
                    data-testid="input-security-pin"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePin}
                    className="flex items-center gap-2"
                    data-testid="button-generate-pin"
                  >
                    <Key className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
              )}
            </div>

            {/* Personal Message */}
            <div>
              <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
              <Textarea
                id="personalMessage"
                placeholder="Add a message for the recipient..."
                className="input-professional"
                value={shareData.personalMessage || ""}
                onChange={(e) => setShareData(prev => ({
                  ...prev,
                  personalMessage: e.target.value
                }))}
                rows={3}
                data-testid="textarea-personal-message"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              data-testid="button-cancel-share"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleShare}
              disabled={shareEvidenceMutation.isPending}
              className="btn-primary"
              data-testid="button-create-share"
            >
              {shareEvidenceMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating Share...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Create Secure Share
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}