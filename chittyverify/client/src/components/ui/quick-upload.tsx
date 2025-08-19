import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudUpload, PlusCircle } from "lucide-react";
import { useLocation } from "wouter";

export function QuickUpload() {
  const [, setLocation] = useLocation();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // For now, redirect to upload page
    // In a real implementation, you'd handle the file here
    setLocation("/upload");
  };

  const handleClick = () => {
    setLocation("/upload");
  };

  return (
    <Card className="evidence-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <PlusCircle className="w-5 h-5 mr-2 text-primary-blue" />
          Quick Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragOver 
              ? 'border-primary-blue bg-blue-50' 
              : 'border-gray-300 hover:border-primary-blue'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Drag files here or click to browse</p>
          <p className="text-sm text-gray-500">PDF, DOC, IMG files supported</p>
        </div>
        <Button 
          className="w-full mt-4 gradient-gold text-primary-navy font-semibold hover:shadow-glow transition-all duration-300"
          onClick={handleClick}
        >
          Upload Evidence
        </Button>
      </CardContent>
    </Card>
  );
}
