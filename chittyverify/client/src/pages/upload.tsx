import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload as UploadIcon, FileText, CheckCircle, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const uploadSchema = z.object({
  caseId: z.string().min(1, "Case is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Evidence type is required"),
  subtype: z.string().optional(),
  artifactId: z.string().min(1, "Artifact ID is required"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'upload' | 'details' | 'complete'>('upload');

  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
  });

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      caseId: "case-1", // Default to demo case
      title: "",
      description: "",
      type: "",
      subtype: "",
      artifactId: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; formData: UploadFormData }) => {
      // First upload the file
      const fileResponse = await apiRequest("POST", "/api/upload", {
        filename: data.file.name,
        size: data.file.size,
        mimeType: data.file.type,
      });
      
      const fileInfo = await fileResponse.json();

      // Then create the evidence record
      const evidenceResponse = await apiRequest("POST", "/api/evidence", {
        ...data.formData,
        filePath: fileInfo.file.path,
        fileSize: data.file.size,
        mimeType: data.file.type,
        status: "pending",
      });

      return evidenceResponse.json();
    },
    onSuccess: (evidence) => {
      toast({
        title: "Evidence Uploaded Successfully",
        description: `${evidence.title} has been added to the case.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", evidence.caseId, "evidence"] });
      setUploadStep('complete');
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload evidence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      // Auto-generate artifact ID
      const timestamp = Date.now();
      const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const artifactId = `${extension}-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;
      
      form.setValue('artifactId', artifactId);
      form.setValue('title', file.name.replace(/\.[^/.]+$/, ""));
      
      setUploadStep('details');
    }
  };

  const onSubmit = (data: UploadFormData) => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ file: uploadedFile, formData: data });
  };

  const evidenceTypes = [
    { value: "document", label: "Document" },
    { value: "property_tax", label: "Property Tax Record" },
    { value: "communication", label: "Communication" },
    { value: "financial", label: "Financial Record" },
    { value: "legal", label: "Legal Document" },
    { value: "image", label: "Image/Photo" },
  ];

  const subtypes = {
    document: ["contract", "agreement", "certificate", "report"],
    property_tax: ["assessment", "payment_record", "tax_bill", "appeal_document"],
    communication: ["email", "letter", "memo", "text_message"],
    financial: ["bank_statement", "receipt", "invoice", "payment_record"],
    legal: ["court_filing", "legal_brief", "judgment", "order"],
    image: ["photograph", "scan", "screenshot", "diagram"],
  };

  if (uploadStep === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 bg-noise">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="evidence-card text-center">
            <CardContent className="pt-12 pb-12">
              <CheckCircle className="w-16 h-16 text-status-verified mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Evidence Uploaded Successfully!</h2>
              <p className="text-gray-600 mb-8">
                Your evidence has been uploaded and is now being processed for verification.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/">
                  <Button className="gradient-primary text-white">
                    Return to Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setUploadStep('upload');
                    setUploadedFile(null);
                    form.reset();
                  }}
                >
                  Upload Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-noise">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Evidence</h1>
          <p className="text-gray-600">Add new evidence to strengthen your case</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${uploadStep === 'upload' ? 'text-primary-blue' : 'text-status-verified'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${uploadStep === 'upload' ? 'bg-primary-blue text-white' : 'bg-status-verified text-white'}`}>
                {uploadStep === 'upload' ? '1' : <CheckCircle className="w-5 h-5" />}
              </div>
              <span className="font-medium">Upload File</span>
            </div>
            <div className={`flex-1 h-1 ${uploadStep !== 'upload' ? 'bg-status-verified' : 'bg-gray-200'} rounded`}></div>
            <div className={`flex items-center space-x-2 ${uploadStep === 'details' ? 'text-primary-blue' : uploadStep === 'complete' ? 'text-status-verified' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${uploadStep === 'details' ? 'bg-primary-blue text-white' : uploadStep === 'complete' ? 'bg-status-verified text-white' : 'bg-gray-300 text-gray-600'}`}>
                {uploadStep === 'complete' ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Add Details</span>
            </div>
          </div>
        </div>

        {uploadStep === 'upload' && (
          <Card className="evidence-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UploadIcon className="w-6 h-6 mr-2 text-primary-blue" />
                Select Evidence File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-blue transition-colors cursor-pointer">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.eml,.msg"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Choose a file to upload</h3>
                  <p className="text-gray-500 mb-4">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-400">
                    Supported formats: PDF, DOC, TXT, JPG, PNG, EML
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadStep === 'details' && uploadedFile && (
          <Card className="evidence-card">
            <CardHeader>
              <CardTitle>Evidence Details</CardTitle>
            </CardHeader>
            <CardContent>
              {/* File Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-primary-blue" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type}
                    </p>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cases?.map((case_: any) => (
                              <SelectItem key={case_.id} value={case_.id}>
                                {case_.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="artifactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artifact ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., DOC-2024-001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this evidence (auto-generated)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Evidence title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe this evidence and its relevance to the case"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evidence Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select evidence type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {evidenceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("type") && (
                    <FormField
                      control={form.control}
                      name="subtype"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtype</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subtype (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subtypes[form.watch("type") as keyof typeof subtypes]?.map((subtype) => (
                                <SelectItem key={subtype} value={subtype}>
                                  {subtype.replace('_', ' ').split(' ').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUploadStep('upload');
                        setUploadedFile(null);
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploadMutation.isPending}
                      className="gradient-gold text-primary-navy flex-1"
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Upload Evidence"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
