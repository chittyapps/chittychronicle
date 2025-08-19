import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  evidenceId?: string;
}

export function BatchUploadWidget() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [caseId, setCaseId] = useState('');
  const [evidenceTier, setEvidenceTier] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (uploadData: { files: UploadFile[], caseId: string, evidenceTier: string }) => {
      const results = [];
      
      for (const uploadFile of uploadData.files) {
        try {
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 25 } : f
          ));

          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', uploadFile.file);
          formData.append('caseId', uploadData.caseId);
          formData.append('evidenceTier', uploadData.evidenceTier);
          formData.append('evidenceType', 'Document');
          
          // Upload to backend
          const response = await fetch('/api/evidence/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();
          
          // Update progress
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { 
              ...f, 
              status: 'success', 
              progress: 100,
              evidenceId: result.evidence?.id 
            } : f
          ));

          results.push(result);
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : f
          ));
        }
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
    }
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadFile[] = droppedFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = () => {
    if (!caseId || !evidenceTier || files.length === 0) return;
    
    uploadMutation.mutate({ files, caseId, evidenceTier });
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-green-400" />
          <span className="text-green-400">Batch Evidence Upload</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Upload Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Case ID</Label>
            <Input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="Enter case identifier"
              className="bg-slate-800 border-slate-600 text-white"
              data-testid="input-case-id"
            />
          </div>
          <div>
            <Label className="text-slate-300">Evidence Tier</Label>
            <Select value={evidenceTier} onValueChange={setEvidenceTier}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOVERNMENT">Government (0.95)</SelectItem>
                <SelectItem value="FINANCIAL_INSTITUTION">Financial (0.85)</SelectItem>
                <SelectItem value="LEGAL_PROFESSIONAL">Legal Professional (0.80)</SelectItem>
                <SelectItem value="EXPERT_WITNESS">Expert Witness (0.75)</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual (0.60)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-green-400 bg-green-400/10' 
              : 'border-slate-600 hover:border-slate-500'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-slate-300 mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Supports: PDF, DOCX, PNG, JPG, TXT
          </p>
          <Input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
          />
          <Button 
            onClick={() => document.getElementById('file-input')?.click()}
            variant="outline"
            className="border-green-400 text-green-400 hover:bg-green-400/10"
            data-testid="button-browse-files"
          >
            Browse Files
          </Button>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-white">Files ({files.length})</h4>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <Badge variant="outline" className="border-green-400 text-green-400">
                    {successCount} uploaded
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="border-red-400 text-red-400">
                    {errorCount} failed
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-600"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <div className="w-24">
                      <Progress value={file.progress} className="h-2" />
                    </div>
                  )}
                  
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-400 max-w-32 truncate">
                      {file.error}
                    </p>
                  )}
                  
                  {file.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-white"
                      data-testid={`button-remove-${file.id}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && pendingCount > 0 && (
          <Button
            onClick={handleUpload}
            disabled={!caseId || !evidenceTier || uploadMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
            data-testid="button-start-upload"
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading {files.length} files...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Upload & ChittyVerify ({pendingCount} files)
              </div>
            )}
          </Button>
        )}

        {/* Summary */}
        {successCount > 0 && (
          <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-4">
            <p className="text-sm text-green-400">
              ✓ {successCount} files uploaded successfully and ready for ChittyVerify
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BatchUploadWidget;