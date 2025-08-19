import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Upload, 
  Mail, 
  Phone, 
  IdCard, 
  Home,
  Camera,
  FileText,
  Star,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  trustPoints: number;
  estimatedTime: string;
}

const verificationSteps: VerificationStep[] = [
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Verify your email address to start building trust',
    icon: <Mail className="h-6 w-6" />,
    required: true,
    trustPoints: 50,
    estimatedTime: '2 minutes'
  },
  {
    id: 'phone',
    title: 'Phone Verification', 
    description: 'Add and verify your phone number',
    icon: <Phone className="h-6 w-6" />,
    required: true,
    trustPoints: 50,
    estimatedTime: '3 minutes'
  },
  {
    id: 'id_card',
    title: 'Government ID',
    description: 'Upload a government-issued photo ID',
    icon: <IdCard className="h-6 w-6" />,
    required: false,
    trustPoints: 200,
    estimatedTime: '5 minutes'
  },
  {
    id: 'address',
    title: 'Address Proof',
    description: 'Verify your residential address',
    icon: <Home className="h-6 w-6" />,
    required: false,
    trustPoints: 100,
    estimatedTime: '4 minutes'
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    description: 'Take a selfie to confirm your identity',
    icon: <Camera className="h-6 w-6" />,
    required: false,
    trustPoints: 75,
    estimatedTime: '2 minutes'
  }
];

export default function VerificationFlow() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<any>({});

  // Get user's current verifications
  const { data: verifications = [] } = useQuery({
    queryKey: ['/api/verifications'],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    enabled: !!user,
  });

  const addVerificationMutation = useMutation({
    mutationFn: async (data: { verificationType: string; metadata?: any }) => {
      const response = await apiRequest('POST', '/api/verifications', data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      setCompletedSteps(prev => new Set([...prev, variables.verificationType]));
      
      toast({
        title: "Verification Submitted",
        description: `Your ${variables.verificationType.replace('_', ' ')} verification has been submitted successfully!`,
      });
      
      // Auto-advance to next step
      if (currentStep < verificationSteps.length - 1) {
        setTimeout(() => setCurrentStep(currentStep + 1), 1500);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Verification Failed",
        description: "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="loading-verification">
        <div className="text-center">
          <Shield className="h-8 w-8 text-blue-600 animate-pulse mx-auto mb-4" />
          <div className="text-slate-600">Loading verification flow...</div>
        </div>
      </div>
    );
  }

  const currentStepData = verificationSteps[currentStep];
  const totalSteps = verificationSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Check if step is already verified
  const getVerificationStatus = (stepId: string) => {
    return verifications.find((v: any) => v.verificationType === stepId)?.status || null;
  };

  const handleStepSubmit = async () => {
    if (!currentStepData) return;

    const stepId = currentStepData.id;
    const metadata = formData[stepId] || {};

    await addVerificationMutation.mutateAsync({
      verificationType: stepId,
      metadata
    });

    // Clear form data for this step
    setFormData(prev => ({ ...prev, [stepId]: {} }));
  };

  const updateFormData = (stepId: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...data }
    }));
  };

  const renderStepForm = () => {
    const stepId = currentStepData.id;
    const data = formData[stepId] || {};
    const status = getVerificationStatus(stepId);

    if (status === 'verified') {
      return (
        <Card className="border-blue-200 bg-blue-50" data-testid="step-completed">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Verification Complete!</h3>
            <p className="text-blue-700">
              Your {currentStepData.title.toLowerCase()} has been successfully verified.
            </p>
            <Badge className="mt-4 bg-blue-600 text-white">
              +{currentStepData.trustPoints} Trust Points Earned
            </Badge>
          </CardContent>
        </Card>
      );
    }

    switch (stepId) {
      case 'email':
        return (
          <Card data-testid="form-email">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={data.email || ''}
                  onChange={(e) => updateFormData(stepId, { email: e.target.value })}
                  data-testid="input-email-verification"
                />
              </div>
              <div className="text-sm text-slate-600">
                <Shield className="h-4 w-4 inline mr-2" />
                We'll send a verification link to this email address.
              </div>
            </CardContent>
          </Card>
        );

      case 'phone':
        return (
          <Card data-testid="form-phone">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={data.phone || ''}
                  onChange={(e) => updateFormData(stepId, { phone: e.target.value })}
                  data-testid="input-phone-verification"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={data.country || 'US'}
                  onChange={(e) => updateFormData(stepId, { country: e.target.value })}
                  data-testid="select-country"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
              <div className="text-sm text-slate-600">
                <Phone className="h-4 w-4 inline mr-2" />
                We'll send a verification code via SMS.
              </div>
            </CardContent>
          </Card>
        );

      case 'id_card':
        return (
          <Card data-testid="form-id-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="id_type">ID Type</Label>
                <select
                  id="id_type"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={data.id_type || ''}
                  onChange={(e) => updateFormData(stepId, { id_type: e.target.value })}
                  data-testid="select-id-type-verification"
                >
                  <option value="">Select ID Type</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="passport">Passport</option>
                  <option value="state_id">State ID</option>
                  <option value="national_id">National ID</option>
                </select>
              </div>
              <div>
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  placeholder="Enter your ID number"
                  value={data.id_number || ''}
                  onChange={(e) => updateFormData(stepId, { id_number: e.target.value })}
                  data-testid="input-id-number-verification"
                />
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-slate-700 mb-2">Upload ID Document</div>
                <div className="text-sm text-slate-500 mb-4">
                  JPG, PNG, or PDF up to 10MB. Both front and back sides required.
                </div>
                <Button variant="outline" data-testid="button-upload-id">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
              <div className="text-sm text-slate-600">
                <Shield className="h-4 w-4 inline mr-2" />
                Your documents are encrypted and stored securely.
              </div>
            </CardContent>
          </Card>
        );

      case 'address':
        return (
          <Card data-testid="form-address">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="address_line1">Street Address</Label>
                <Input
                  id="address_line1"
                  placeholder="123 Main Street"
                  value={data.address_line1 || ''}
                  onChange={(e) => updateFormData(stepId, { address_line1: e.target.value })}
                  data-testid="input-address-line1"
                />
              </div>
              <div>
                <Label htmlFor="address_line2">Apartment, Suite, etc. (Optional)</Label>
                <Input
                  id="address_line2"
                  placeholder="Apt 4B"
                  value={data.address_line2 || ''}
                  onChange={(e) => updateFormData(stepId, { address_line2: e.target.value })}
                  data-testid="input-address-line2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={data.city || ''}
                    onChange={(e) => updateFormData(stepId, { city: e.target.value })}
                    data-testid="input-city-verification"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={data.state || ''}
                    onChange={(e) => updateFormData(stepId, { state: e.target.value })}
                    data-testid="input-state-verification"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="10001"
                  value={data.zip || ''}
                  onChange={(e) => updateFormData(stepId, { zip: e.target.value })}
                  data-testid="input-zip-verification"
                />
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <div className="text-sm text-slate-600 mb-2">Upload Proof of Address</div>
                <div className="text-xs text-slate-500 mb-4">
                  Utility bill, bank statement, or lease agreement from the last 3 months
                </div>
                <Button variant="outline" size="sm" data-testid="button-upload-address">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'selfie':
        return (
          <Card data-testid="form-selfie">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Camera className="h-16 w-16 text-slate-400" />
                </div>
                <div className="text-lg font-medium text-slate-700 mb-2">Take a Selfie</div>
                <div className="text-sm text-slate-500 mb-4">
                  Position your face in the center and ensure good lighting
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" data-testid="button-take-photo">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button variant="outline" data-testid="button-upload-photo">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
              <div className="text-sm text-slate-600 text-center">
                <Shield className="h-4 w-4 inline mr-2" />
                This helps us verify that you are the person in your ID document.
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-slate-900" data-testid="text-verification-logo">ChittyID Verification</span>
            </div>
            <div className="flex items-center space-x-6">
              <nav className="flex items-center space-x-4">
                <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Overview</a>
                <span className="text-sm text-blue-600 font-medium">Verification</span>
                <a href="/business" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Business</a>
              </nav>
              <div className="text-sm text-slate-600" data-testid="text-current-trust-score">
                Trust Score: {stats?.trustScore || 0}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <Card className="mb-8" data-testid="card-progress">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Verification Progress</h2>
              <span className="text-sm text-slate-600" data-testid="text-step-counter">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <Progress value={progress} className="h-2 mb-4" data-testid="progress-verification" />
            <div className="flex justify-between text-sm text-slate-600">
              <span>Start</span>
              <span>Complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Step Navigation */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {verificationSteps.map((step, index) => {
            const status = getVerificationStatus(step.id);
            const isCompleted = status === 'verified';
            const isCurrent = index === currentStep;
            const isPending = status === 'pending';

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`p-3 rounded-lg text-center transition-all ${
                  isCompleted
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                    : isPending
                    ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                data-testid={`step-nav-${index}`}
              >
                <div className="flex justify-center mb-2">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isPending ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="text-xs font-medium">{step.title}</div>
                {step.required && (
                  <div className="text-xs text-red-600 mt-1">Required</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Step */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="mb-6" data-testid="card-current-step">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  {currentStepData.icon}
                  <span>{currentStepData.title}</span>
                  {currentStepData.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                <p className="text-slate-600">{currentStepData.description}</p>
              </CardHeader>
            </Card>

            {renderStepForm()}

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                data-testid="button-previous-step"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="space-x-2">
                {getVerificationStatus(currentStepData.id) !== 'verified' && (
                  <Button
                    onClick={handleStepSubmit}
                    disabled={addVerificationMutation.isPending}
                    data-testid="button-submit-step"
                  >
                    {addVerificationMutation.isPending ? 'Submitting...' : 'Submit Verification'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                
                {currentStep < totalSteps - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    data-testid="button-next-step"
                  >
                    Skip for Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card data-testid="card-step-info">
              <CardHeader>
                <CardTitle className="text-lg">Step Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Trust Points</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    +{currentStepData.trustPoints}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Estimated Time</span>
                  <span className="text-sm font-medium">{currentStepData.estimatedTime}</span>
                </div>
                <Separator />
                <div className="text-xs text-slate-500">
                  {currentStepData.required
                    ? 'This verification is required to activate your ChittyID'
                    : 'Optional verification that increases your trust score'
                  }
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-trust-progress">
              <CardHeader>
                <CardTitle className="text-lg">Trust Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current Score</span>
                      <span className="font-medium">{stats?.trustScore || 0}</span>
                    </div>
                    <Progress value={(stats?.trustScore || 0) / 10} className="h-2" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Next Milestone</div>
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Reach 200 points for L1 status</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-verification-benefits">
              <CardHeader>
                <CardTitle className="text-lg">Why Verify?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Instant approval at partner businesses</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>No more repeated document uploads</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Higher trust score = better rates</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>Priority customer support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
