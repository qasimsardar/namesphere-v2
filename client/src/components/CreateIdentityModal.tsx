import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertIdentitySchema } from "@shared/schema";

const formSchema = insertIdentitySchema.extend({
  otherNamesInput: z.string().optional(),
  socialLinksInput: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateIdentityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIdentityModal({ open, onOpenChange }: CreateIdentityModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personalName: "",
      context: "",
      otherNames: [],
      otherNamesInput: "",
      pronouns: "",
      title: "",
      avatarUrl: "",
      socialLinks: {},
      socialLinksInput: "",
      isPrimary: false,
      isDiscoverable: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { otherNamesInput, socialLinksInput, ...identityData } = data;
      
      // Parse other names from comma-separated string
      const otherNames = otherNamesInput
        ? otherNamesInput.split(",").map(name => name.trim()).filter(name => name.length > 0)
        : [];

      // Parse social links from JSON string
      let socialLinks = {};
      if (socialLinksInput && socialLinksInput.trim()) {
        try {
          socialLinks = JSON.parse(socialLinksInput);
        } catch (e) {
          throw new Error("Invalid social links format. Please use valid JSON like {\"twitter\": \"https://twitter.com/username\"}");
        }
      }

      const payload = {
        ...identityData,
        otherNames,
        socialLinks,
      };

      const response = await apiRequest("POST", "/api/identities", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identities"] });
      toast({
        title: "Success",
        description: "Identity created successfully",
      });
      onOpenChange(false);
      form.reset();
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
        description: error.message || "Failed to create identity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col" data-testid="modal-create-identity">
        <DialogHeader>
          <DialogTitle>Create New Identity</DialogTitle>
          <DialogDescription>
            Create a new identity profile for a specific context.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personalName">Personal Name *</Label>
            <Input
              id="personalName"
              placeholder="Enter your name for this context"
              {...form.register("personalName")}
              data-testid="input-personal-name"
            />
            {form.formState.errors.personalName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.personalName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context *</Label>
            <Select 
              onValueChange={(value) => form.setValue("context", value)}
              data-testid="select-context"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.context && (
              <p className="text-sm text-destructive">
                {form.formState.errors.context.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherNames">Other Names</Label>
            <Input
              id="otherNames"
              placeholder="Nicknames, initials, former names (comma-separated)"
              {...form.register("otherNamesInput")}
              data-testid="input-other-names"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Enter multiple names separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pronouns">Pronouns</Label>
            <Input
              id="pronouns"
              placeholder="e.g., they/them, she/her, he/him"
              {...form.register("pronouns")}
              data-testid="input-pronouns"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Dr., Mr., Ms., Engineer"
              {...form.register("title")}
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              {...form.register("avatarUrl")}
              data-testid="input-avatar-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialLinks">Social Links</Label>
            <Input
              id="socialLinks"
              placeholder='{"twitter": "https://twitter.com/username", "linkedin": "https://linkedin.com/in/username"}'
              {...form.register("socialLinksInput")}
              data-testid="input-social-links"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Enter as JSON format, e.g., {`{"twitter": "https://twitter.com/username"}`}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="setPrimary"
              checked={form.watch("isPrimary") || false}
              onCheckedChange={(checked) => form.setValue("isPrimary", checked === true)}
              data-testid="checkbox-set-primary"
            />
            <Label htmlFor="setPrimary" className="text-sm">
              Set as primary identity
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="setDiscoverable"
              checked={form.watch("isDiscoverable") || false}
              onCheckedChange={(checked) => form.setValue("isDiscoverable", checked === true)}
              data-testid="checkbox-set-discoverable"
            />
            <Label htmlFor="setDiscoverable" className="text-sm">
              Make discoverable in public search
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, this identity will appear in search results for other users in the same context
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Identity"}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
