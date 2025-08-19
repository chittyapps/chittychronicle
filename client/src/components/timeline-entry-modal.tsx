import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import type { TimelineEntry } from "@shared/schema";

const timelineEntrySchema = z.object({
  entryType: z.enum(['task', 'event']),
  eventSubtype: z.enum(['deadline', 'filed', 'signed', 'executed', 'served', 'hearing', 'occurred', 'expired']).optional(),
  taskSubtype: z.enum(['draft', 'file', 'serve', 'review', 'respond']).optional(),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  detailedNotes: z.string().optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low', 'unverified']),
  eventStatus: z.enum(['occurred', 'upcoming', 'missed']).optional(),
  taskStatus: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type TimelineEntryFormData = z.infer<typeof timelineEntrySchema>;

interface TimelineEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  entry?: TimelineEntry | null;
}

export default function TimelineEntryModal({ 
  isOpen, 
  onClose, 
  caseId, 
  entry 
}: TimelineEntryModalProps) {
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");

  const form = useForm<TimelineEntryFormData>({
    resolver: zodResolver(timelineEntrySchema),
    defaultValues: {
      entryType: 'event',
      date: '',
      description: '',
      detailedNotes: '',
      confidenceLevel: 'high',
      tags: [],
    },
  });

  const entryType = form.watch('entryType');

  // Update form when editing an entry
  useEffect(() => {
    if (entry) {
      form.reset({
        entryType: entry.entryType,
        eventSubtype: entry.eventSubtype || undefined,
        taskSubtype: entry.taskSubtype || undefined,
        date: entry.date,
        description: entry.description,
        detailedNotes: entry.detailedNotes || '',
        confidenceLevel: entry.confidenceLevel,
        eventStatus: entry.eventStatus || undefined,
        taskStatus: entry.taskStatus || undefined,
        assignedTo: entry.assignedTo || '',
        dueDate: entry.dueDate || '',
        tags: entry.tags || [],
      });
    } else {
      form.reset({
        entryType: 'event',
        date: '',
        description: '',
        detailedNotes: '',
        confidenceLevel: 'high',
        tags: [],
      });
    }
  }, [entry, form]);

  const createMutation = useMutation({
    mutationFn: async (data: TimelineEntryFormData) => {
      await apiRequest("POST", "/api/timeline/entries", {
        ...data,
        caseId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/analysis/deadlines"] });
      onClose();
      toast({
        title: "Success",
        description: "Timeline entry created successfully",
      });
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
        title: "Error",
        description: "Failed to create timeline entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TimelineEntryFormData) => {
      await apiRequest("PUT", `/api/timeline/entries/${entry!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/analysis/deadlines"] });
      onClose();
      toast({
        title: "Success",
        description: "Timeline entry updated successfully",
      });
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
        title: "Error",
        description: "Failed to update timeline entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimelineEntryFormData) => {
    if (entry) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags');
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Timeline Entry' : 'Create Timeline Entry'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entry Type */}
              <FormField
                control={form.control}
                name="entryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="entry-type-select">
                          <SelectValue placeholder="Select entry type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subtype based on entry type */}
              {entryType === 'event' && (
                <FormField
                  control={form.control}
                  name="eventSubtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Subtype</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="event-subtype-select">
                            <SelectValue placeholder="Select event subtype" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="filed">Filed</SelectItem>
                          <SelectItem value="signed">Signed</SelectItem>
                          <SelectItem value="executed">Executed</SelectItem>
                          <SelectItem value="served">Served</SelectItem>
                          <SelectItem value="hearing">Hearing</SelectItem>
                          <SelectItem value="occurred">Occurred</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {entryType === 'task' && (
                <FormField
                  control={form.control}
                  name="taskSubtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Subtype</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="task-subtype-select">
                            <SelectValue placeholder="Select task subtype" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                          <SelectItem value="serve">Serve</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="respond">Respond</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        data-testid="entry-date-input"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confidence Level */}
              <FormField
                control={form.control}
                name="confidenceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Level *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="confidence-level-select">
                          <SelectValue placeholder="Select confidence level" />
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

              {/* Status based on entry type */}
              {entryType === 'event' && (
                <FormField
                  control={form.control}
                  name="eventStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="event-status-select">
                            <SelectValue placeholder="Select event status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="occurred">Occurred</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="missed">Missed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {entryType === 'task' && (
                <FormField
                  control={form.control}
                  name="taskStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="task-status-select">
                            <SelectValue placeholder="Select task status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Assigned To (for tasks) */}
              {entryType === 'task' && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Attorney or staff member"
                          data-testid="assigned-to-input"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Due Date (for tasks) */}
              {entryType === 'task' && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          data-testid="due-date-input"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Brief description of the event or task"
                      data-testid="entry-description-input"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Detailed Notes */}
            <FormField
              control={form.control}
              name="detailedNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Extended information and context"
                      data-testid="entry-notes-textarea"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="Add a tag"
                  data-testid="tag-input"
                />
                <Button type="button" onClick={addTag} variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.watch('tags').map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)}
                      className="text-xs hover:text-red-600"
                      data-testid={`remove-tag-${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="cancel-entry-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary-dark text-white"
                data-testid="save-entry-button"
              >
                {(createMutation.isPending || updateMutation.isPending) 
                  ? "Saving..." 
                  : entry 
                    ? "Update Entry" 
                    : "Create Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
