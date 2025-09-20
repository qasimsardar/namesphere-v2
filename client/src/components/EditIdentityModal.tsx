import { useEffect } from "react";
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
import { updateIdentitySchema, type Identity } from "@shared/schema";

const formSchema = updateIdentitySchema.extend({
  otherNamesInput: z.string().optional(),
  socialLinksInput: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditIdentityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identity: Identity;
}

export function EditIdentityModal({ open, onOpenChange, identity }: EditIdentityModalProps) {
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

  // Update form values when identity changes
  useEffect(() => {
    if (identity) {
      form.reset({
        personalName: identity.personalName,
        context: identity.context,
        otherNames: identity.otherNames || [],
        otherNamesInput: (identity.otherNames || []).join(", "),
        pronouns: identity.pronouns || "",
        title: identity.title || "",
        avatarUrl: identity.avatarUrl || "",
        socialLinks: identity.socialLinks || {},
        socialLinksInput: identity.socialLinks ? JSON.stringify(identity.socialLinks, null, 2) : "",
        isPrimary: identity.isPrimary,
        isDiscoverable: identity.isDiscoverable || false,
      });
    }
  }, [identity, form]);

  const updateMutation = useMutation({
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

      const response = await apiRequest("PUT", `/api/identities/${identity.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identities"] });
      toast({
        title: "Success",
        description: "Identity updated successfully",
      });
      onOpenChange(false);
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
        description: error.message || "Failed to update identity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col" data-testid="modal-edit-identity">
        <DialogHeader>
          <DialogTitle>Edit Identity</DialogTitle>
          <DialogDescription>
            Update your identity profile for this context.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-personalName">Personal Name *</Label>
            <Input
              id="edit-personalName"
              placeholder="Enter your name for this context"
              {...form.register("personalName")}
              data-testid="input-edit-personal-name"
            />
            {form.formState.errors.personalName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.personalName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-context">Context *</Label>
            <Select 
              value={form.watch("context") || ""}
              onValueChange={(value) => form.setValue("context", value)}
              data-testid="select-edit-context"
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
            <Label htmlFor="edit-otherNames">Other Names</Label>
            <Input
              id="edit-otherNames"
              placeholder="Nicknames, initials, former names (comma-separated)"
              {...form.register("otherNamesInput")}
              data-testid="input-edit-other-names"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Enter multiple names separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-pronouns">Pronouns</Label>
            <Input
              id="edit-pronouns"
              placeholder="e.g., they/them, she/her, he/him"
              {...form.register("pronouns")}
              data-testid="input-edit-pronouns"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="e.g., Dr., Mr., Ms., Engineer"
              {...form.register("title")}
              data-testid="input-edit-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-avatarUrl">Avatar URL</Label>
            <Input
              id="edit-avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              {...form.register("avatarUrl")}
              data-testid="input-edit-avatar-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-socialLinks">Social Links</Label>
            <Input
              id="edit-socialLinks"
              placeholder='{"twitter": "https://twitter.com/username", "linkedin": "https://linkedin.com/in/username"}'
              {...form.register("socialLinksInput")}
              data-testid="input-edit-social-links"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Enter as JSON format, e.g., {`{"twitter": "https://twitter.com/username"}`}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-setPrimary"
              checked={form.watch("isPrimary") || false}
              onCheckedChange={(checked) => form.setValue("isPrimary", checked === true)}
              data-testid="checkbox-edit-set-primary"
            />
            <Label htmlFor="edit-setPrimary" className="text-sm">
              Set as primary identity
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-setDiscoverable"
              checked={form.watch("isDiscoverable") || false}
              onCheckedChange={(checked) => form.setValue("isDiscoverable", checked === true)}
              data-testid="checkbox-edit-set-discoverable"
            />
            <Label htmlFor="edit-setDiscoverable" className="text-sm">
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
              data-testid="button-edit-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              data-testid="button-edit-save"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
