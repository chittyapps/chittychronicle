import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Plus, Mail, Phone, IdCard, Home, Upload, Clock, AlertTriangle } from "lucide-react";

interface VerificationStepsProps {
  hasChittyId: boolean;
  verifications: any[];
  onAddVerification: (type: string, metadata?: any) => void;
  isAddingVerification: boolean;
}

interface VerificationDialogProps {
  type: 'email' | 'phone' | 'id_card' | 'address';
  title: string;
  description: string;
  icon: React.ReactNode;
  onSubmit: (metadata: any) => void;
  isLoading: boolean;
}

function VerificationDialog({ type, title, description, icon, onSubmit, isLoading }: VerificationDialogProps) {
  const [formData, setFormData] = useState<any>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({});
    setIsOpen(false);
  };

  const renderForm = () => {
    switch (type) {
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
          </div>
        );
      
      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>
          </div>
        );
      
      case 'id_card':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="id_type">ID Type</Label>
              <select
                id="id_type"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={formData.id_type || ''}
                onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                data-testid="select-id-type"
              >
                <option value="">Select ID Type</option>
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="state_id">State ID</option>
              </select>
            </div>
            <div>
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                placeholder="ID Number"
                value={formData.id_number || ''}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                data-testid="input-id-number"
              />
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm text-slate-600">Upload ID Document</div>
              <div className="text-xs text-slate-500 mt-1">JPG, PNG, or PDF up to 10MB</div>
            </div>
          </div>
        );
      
      case 'address':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="12345"
                value={formData.zip || ''}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                data-testid="input-zip"
              />
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm text-slate-600">Upload Proof of Address</div>
              <div className="text-xs text-slate-500 mt-1">Utility bill, bank statement, or lease</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto p-4 flex-col space-y-2" data-testid={`button-add-${type}`}>
          {icon}
          <span>{title}</span>
          <span className="text-xs text-slate-500">{description}</span>
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-${type}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-slate-600">{description}</p>
          {renderForm()}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              data-testid="button-submit-verification"
            >
              {isLoading ? 'Adding...' : 'Add Verification'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VerificationSteps({ hasChittyId, verifications, onAddVerification, isAddingVerification }: VerificationStepsProps) {
  if (!hasChittyId) {
    return (
      <Card data-testid="card-no-chittyid">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Create Your ChittyID First</h3>
          <p className="text-slate-600">
            You need to create a ChittyID before you can start adding verifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  const verificationTypes = [
    {
      type: 'email' as const,
      title: 'Email Verification',
      description: 'Verify your email address',
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      points: '+50 Trust Points'
    },
    {
      type: 'phone' as const,
      title: 'Phone Verification',
      description: 'Verify your phone number',
      icon: <Phone className="h-6 w-6 text-red-600" />,
      points: '+50 Trust Points'
    },
    {
      type: 'id_card' as const,
      title: 'Government ID',
      description: 'Upload government-issued ID',
      icon: <IdCard className="h-6 w-6 text-purple-600" />,
      points: '+200 Trust Points'
    },
    {
      type: 'address' as const,
      title: 'Address Verification',
      description: 'Verify your home address',
      icon: <Home className="h-6 w-6 text-orange-600" />,
      points: '+100 Trust Points'
    },
  ];

  const getVerificationStatus = (type: string) => {
    const verification = verifications.find(v => v.verificationType === type);
    return verification?.status || null;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const configs = {
      verified: { color: 'bg-blue-100 text-blue-600', icon: <CheckCircle className="h-3 w-3" /> },
      pending: { color: 'bg-yellow-100 text-yellow-600', icon: <Clock className="h-3 w-3" /> },
      rejected: { color: 'bg-red-100 text-red-600', icon: <AlertTriangle className="h-3 w-3" /> },
    };

    const config = configs[status as keyof typeof configs];
    return (
      <Badge className={config.color} data-testid={`badge-${status}`}>
        {config.icon}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-verification-overview">
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">
            Complete these verification steps to increase your trust score and unlock access to more services in the ChittyID network.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {verificationTypes.map((verificationType) => {
              const status = getVerificationStatus(verificationType.type);
              const isVerified = status === 'verified';
              
              return (
                <div key={verificationType.type} className="relative" data-testid={`verification-type-${verificationType.type}`}>
                  {isVerified ? (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {verificationType.icon}
                            <span className="font-medium">{verificationType.title}</span>
                          </div>
                          {getStatusBadge(status)}
                        </div>
                        <p className="text-sm text-slate-600">{verificationType.description}</p>
                        <div className="text-xs text-blue-600 mt-2">{verificationType.points} Earned</div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="relative">
                      {status && (
                        <div className="absolute top-2 right-2 z-10">
                          {getStatusBadge(status)}
                        </div>
                      )}
                      <VerificationDialog
                        type={verificationType.type}
                        title={verificationType.title}
                        description={verificationType.description}
                        icon={verificationType.icon}
                        onSubmit={(metadata) => onAddVerification(verificationType.type, metadata)}
                        isLoading={isAddingVerification}
                      />
                      <div className="absolute bottom-2 left-2 text-xs text-blue-600 font-medium">
                        {verificationType.points}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Verification History */}
      {verifications.length > 0 && (
        <Card data-testid="card-verification-history">
          <CardHeader>
            <CardTitle>Verification History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {verifications.map((verification, index) => (
                <div key={verification.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg" data-testid={`verification-history-${index}`}>
                  <div>
                    <div className="font-medium capitalize">
                      {verification.verificationType.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-slate-600">
                      Added on {new Date(verification.createdAt).toLocaleDateString()}
                    </div>
                    {verification.verifiedAt && (
                      <div className="text-sm text-blue-600">
                        Verified on {new Date(verification.verifiedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(verification.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
