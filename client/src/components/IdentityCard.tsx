import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Edit, Trash2, ExternalLink, User } from "lucide-react";
import type { Identity } from "@shared/schema";

interface IdentityCardProps {
  identity: Identity;
  onSetPrimary: (id: string) => void;
  onEdit: (identity: Identity) => void;
  onDelete: (id: string, personalName: string) => void;
  isSettingPrimary?: boolean;
  isDeleting?: boolean;
}

export function IdentityCard({
  identity,
  onSetPrimary,
  onEdit,
  onDelete,
  isSettingPrimary,
  isDeleting
}: IdentityCardProps) {
  const getContextBadgeClass = (context: string) => {
    switch (context) {
      case "legal": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "work": return "bg-green-100 text-green-700 hover:bg-green-200";
      case "social": return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "gaming": return "bg-orange-100 text-orange-700 hover:bg-orange-200";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  return (
    <Card 
      className="hover:border-primary/30 transition-colors" 
      data-testid={`card-identity-${identity.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                {identity.avatarUrl && (
                  <img 
                    src={identity.avatarUrl} 
                    alt={`${identity.personalName} avatar`}
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid={`img-avatar-${identity.id}`}
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold" data-testid={`text-name-${identity.id}`}>
                    {identity.title ? `${identity.title} ${identity.personalName}` : identity.personalName}
                  </h3>
                  {identity.pronouns && (
                    <span className="text-sm text-muted-foreground" data-testid={`text-pronouns-${identity.id}`}>
                      {identity.pronouns}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge 
                  variant="secondary" 
                  className={getContextBadgeClass(identity.context)}
                  data-testid={`badge-context-${identity.id}`}
                >
                  {identity.context}
                </Badge>
                {identity.isPrimary && (
                  <Badge variant="default" data-testid={`badge-primary-${identity.id}`}>
                    Primary
                  </Badge>
                )}
              </div>
            </div>
            {identity.otherNames && identity.otherNames.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Other names: </span>
                <span className="text-sm" data-testid={`text-other-names-${identity.id}`}>
                  {identity.otherNames.join(", ")}
                </span>
              </div>
            )}
            {identity.socialLinks && typeof identity.socialLinks === 'object' && Object.keys(identity.socialLinks).length > 0 ? (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Social links: </span>
                <div className="flex gap-2 mt-1">
                  {Object.entries(identity.socialLinks as Record<string, string>).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
                      data-testid={`link-social-${platform}-${identity.id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>
                ID: <code data-testid={`text-id-${identity.id}`}>{identity.id}</code>
              </span>
              <span>
                Created: <span data-testid={`text-created-${identity.id}`}>
                  {new Date(identity.createdAt!).toLocaleDateString()}
                </span>
              </span>
              <span>
                Updated: <span data-testid={`text-updated-${identity.id}`}>
                  {new Date(identity.updatedAt!).toLocaleDateString()}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(identity)}
              data-testid={`button-edit-${identity.id}`}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetPrimary(identity.id)}
              disabled={identity.isPrimary || isSettingPrimary}
              title="Set as primary"
              data-testid={`button-set-primary-${identity.id}`}
            >
              <Star className={`w-4 h-4 ${identity.isPrimary ? 'fill-current text-yellow-500' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(identity.id, identity.personalName)}
              disabled={isDeleting}
              title="Delete identity"
              className="text-destructive hover:text-destructive"
              data-testid={`button-delete-${identity.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
