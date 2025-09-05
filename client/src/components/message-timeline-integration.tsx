import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, MessageSquare, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const messageToTimelineSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  significance: z.enum(["high", "medium", "low"]),
  confidenceLevel: z.enum(["high", "medium", "low", "unverified"]),
  additionalNotes: z.string().optional(),
});

type MessageToTimelineData = z.infer<typeof messageToTimelineSchema>;

interface MessageTimelineIntegrationProps {
  message: {
    id: string;
    source: string;
    subject?: string;
    bodyText: string;
    sentAt: string;
    direction: string;
    senderPartyId?: string;
  };
  caseId: string;
  senderName?: string;
  onSuccess?: () => void;
}

export function MessageTimelineIntegration({ 
  message, 
  caseId, 
  senderName, 
  onSuccess 
}: MessageTimelineIntegrationProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const form = useForm<MessageToTimelineData>({
    resolver: zodResolver(messageToTimelineSchema),
    defaultValues: {
      title: message.subject || `${message.source} message from ${senderName || 'Unknown'}`,
      description: message.bodyText.length > 200 
        ? `${message.bodyText.substring(0, 200)}...` 
        : message.bodyText,
      significance: "medium",
      confidenceLevel: "high",
      additionalNotes: "",
    },
  });

  const createTimelineEntryMutation = useMutation({
    mutationFn: async (data: MessageToTimelineData) => {
      const timelineData = {
        date: new Date(message.sentAt).toISOString().split('T')[0],
        time: new Date(message.sentAt).toTimeString().split(' ')[0],
        title: data.title,
        description: data.description,
        location: "",
        participants: senderName || "",
        evidenceType: "communication" as const,
        significance: data.significance,
        source: `${message.source} message (ID: ${message.id})`,
        detailedNotes: data.additionalNotes ? 
          `${data.additionalNotes}\n\nOriginal Message:\n${message.bodyText}` :
          `Original Message:\n${message.bodyText}`,
        confidenceLevel: data.confidenceLevel,
        messageId: message.id, // Link back to the original message
        messageSource: message.source,
        messageDirection: message.direction,
      };

      return await apiRequest("POST", `/api/timeline/${caseId}`, timelineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline", caseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "contradictions"] });
      setShowModal(false);
      form.reset();
      toast({
        title: "Timeline Entry Created",
        description: "Message added to timeline successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Timeline Entry",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageToTimelineData) => {
    createTimelineEntryMutation.mutate(data);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "email": return "bg-blue-100 text-blue-700 border-blue-200";
      case "whatsapp": return "bg-green-100 text-green-700 border-green-200";
      case "imessage": return "bg-gray-100 text-gray-700 border-gray-200";
      case "openphone": return "bg-purple-100 text-purple-700 border-purple-200";
      case "docusign": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "inbound": return "bg-green-100 text-green-700";
      case "outbound": return "bg-blue-100 text-blue-700";
      case "system": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          data-testid={`button-add-timeline-${message.id}`}
        >
          <Clock className="h-4 w-4 mr-1" />
          Add to Timeline
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Add Message to Timeline</span>
          </DialogTitle>
        </DialogHeader>

        {/* Message Preview */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className={getSourceColor(message.source)}>
              {message.source}
            </Badge>
            <Badge variant="outline" className={getDirectionColor(message.direction)}>
              {message.direction}
            </Badge>
            <span className="text-sm text-gray-500">
              {new Date(message.sentAt).toLocaleString()}
            </span>
          </div>
          
          {message.subject && (
            <h4 className="font-medium mb-2">{message.subject}</h4>
          )}
          
          <p className="text-sm text-gray-700 line-clamp-3">
            {message.bodyText}
          </p>
          
          {senderName && (
            <p className="text-sm text-gray-500 mt-2">From: {senderName}</p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeline Entry Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter a descriptive title"
                      data-testid="input-timeline-title"
                    />
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
                      {...field} 
                      placeholder="Enter a summary or key points from the message"
                      rows={3}
                      data-testid="textarea-timeline-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="significance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Significance</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-significance">
                          <SelectValue placeholder="Select significance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidenceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-confidence">
                          <SelectValue placeholder="Select confidence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Add any additional context or analysis"
                      rows={2}
                      data-testid="textarea-additional-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-timeline"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTimelineEntryMutation.isPending}
                data-testid="button-create-timeline-entry"
              >
                {createTimelineEntryMutation.isPending ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Timeline
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}