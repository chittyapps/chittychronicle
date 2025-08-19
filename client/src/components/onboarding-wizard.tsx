import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Upload, Mic, PenTool, FileText, Clock, CheckCircle, 
  ArrowRight, ArrowLeft, Sparkles, Crown, Shield
} from "lucide-react";

interface OnboardingWizardProps {
  onComplete: (caseData: any) => void;
  onSkip: () => void;
}

const caseSchema = z.object({
  caseName: z.string().min(1, "Case name is required"),
  caseNumber: z.string().min(1, "Case number is required"),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const entrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
});

type CaseData = z.infer<typeof caseSchema>;
type EntryData = z.infer<typeof entrySchema>;

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [inputMethod, setInputMethod] = useState<"upload" | "dictate" | "manual">("manual");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const caseForm = useForm<CaseData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseName: "",
      caseNumber: "",
      description: "",
      jurisdiction: "",
    },
  });

  const entryForm = useForm<EntryData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      time: "",
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CaseData & { firstEntry?: EntryData }) => {
      const caseResponse = await apiRequest("POST", "/api/cases", {
        caseName: data.caseName,
        caseNumber: data.caseNumber,
        description: data.description,
        jurisdiction: data.jurisdiction,
      });
      
      if (data.firstEntry) {
        await apiRequest("POST", `/api/timeline/${caseResponse.id}`, {
          ...data.firstEntry,
          evidenceType: "document",
          significance: "medium",
        });
      }
      
      return caseResponse;
    },
    onSuccess: (caseData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      onComplete(caseData);
      toast({
        title: "Welcome to ChittyChronicle!",
        description: "Your case and first timeline entry have been created.",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setUploadedContent(content);
        
        // Simple parsing - in a real app, this would use AI/NLP
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          entryForm.setValue('title', `Document: ${file.name}`);
          entryForm.setValue('description', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
          entryForm.setValue('date', new Date().toISOString().split('T')[0]);
        }
        
        toast({
          title: "Document Uploaded",
          description: "Content has been extracted and pre-filled in the form.",
        });
      };
      reader.readAsText(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // In a real app, this would send to speech-to-text service
        const mockTranscription = "This is a placeholder for speech-to-text transcription. In the full version, your audio would be converted to text automatically.";
        
        entryForm.setValue('description', mockTranscription);
        toast({
          title: "Recording Complete",
          description: "Speech has been transcribed (demo mode).",
        });
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly to dictate your timeline entry.",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    const caseData = caseForm.getValues();
    const entryData = entryForm.getValues();
    
    if (step === 2 && entryData.title && entryData.description) {
      createCaseMutation.mutate({
        ...caseData,
        firstEntry: entryData,
      });
    } else {
      createCaseMutation.mutate(caseData);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Create Your First Case";
      case 2: return "Add Your First Timeline Entry";
      case 3: return "Choose Your Input Method";
      default: return "Get Started";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Clock className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Welcome to ChittyChronicle</h1>
          <Badge variant="outline" className="bg-blue-100 text-blue-700">Lite</Badge>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Let's get you started with timeline management. This guided setup will help you create your first case and timeline entry.
        </p>
        <Progress value={(step / 3) * 100} className="max-w-md mx-auto" />
      </div>

      {/* Upgrade Prompt */}
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">This is ChittyChronicle Lite</p>
                <p className="text-sm text-gray-600">Get unlimited cases, AI analysis, and blockchain verification with ChittyOS Pro</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://id.chitty.cc/get', '_blank')}
            >
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{getStepTitle()}</span>
            <Badge variant="secondary">Step {step} of 3</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <Form {...caseForm}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={caseForm.control}
                    name="caseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith v. Jones" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={caseForm.control}
                    name="caseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="2024-CV-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={caseForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the case..."
                          className="min-h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={caseForm.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <FormControl>
                        <Input placeholder="Superior Court of California" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual" className="flex items-center space-x-2">
                    <PenTool className="h-4 w-4" />
                    <span>Manual Entry</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Document</span>
                  </TabsTrigger>
                  <TabsTrigger value="dictate" className="flex items-center space-x-2">
                    <Mic className="h-4 w-4" />
                    <span>Voice Dictation</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Upload a document to extract timeline information</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                    {uploadedContent && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg text-left">
                        <p className="text-sm text-green-700">✓ Content extracted and pre-filled below</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dictate" className="space-y-4">
                  <div className="text-center space-y-4">
                    <div className={`p-8 rounded-lg border-2 ${isRecording ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                      <Mic className={`h-12 w-12 mx-auto mb-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                      <p className="text-gray-600 mb-4">
                        {isRecording ? "Recording... Click stop when finished" : "Click to start recording your timeline entry"}
                      </p>
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      <Crown className="h-3 w-3 inline mr-1" />
                      Pro Feature: Advanced speech-to-text with legal terminology recognition
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manual">
                  {/* Manual entry is always shown */}
                </TabsContent>
              </Tabs>

              {/* Form is always shown for all input methods */}
              <Form {...entryForm}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={entryForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={entryForm.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={entryForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeline Entry Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Initial client consultation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={entryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the event or evidence..."
                            className="min-h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
                <p className="text-gray-600">
                  Your case and first timeline entry are ready to be created. 
                  You can add more entries and explore the Chitty ecosystem integration.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Next Steps</span>
                </div>
                <p className="text-sm text-gray-700">
                  After creating your case, you can send timeline entries to ChittyLedger for evidence storage, 
                  ChittyVerify for verification, and ChittyTrust for trust scoring.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="space-x-2">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            onClick={onSkip}
          >
            Skip Setup
          </Button>
        </div>

        <div>
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !caseForm.formState.isValid}
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={createCaseMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCaseMutation.isPending ? "Creating..." : "Create Case & Timeline"}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}