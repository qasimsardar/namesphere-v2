import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Code, User, Star, Edit, Trash2 } from "lucide-react";
import { CreateIdentityModal } from "@/components/CreateIdentityModal";
import { EditIdentityModal } from "@/components/EditIdentityModal";
import { IdentityCard } from "@/components/IdentityCard";
import type { Identity } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [showJsonView, setShowJsonView] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState<Identity | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
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
  }, [user, authLoading, toast]);

  const { data: identitiesResponse, isLoading: identitiesLoading } = useQuery({
    queryKey: ["/api/identities", selectedContext],
    queryFn: async () => {
      const url = selectedContext 
        ? `/api/identities?context=${encodeURIComponent(selectedContext)}`
        : "/api/identities";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/identities/${id}/set-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identities"] });
      toast({
        title: "Success",
        description: "Primary identity updated successfully",
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
        description: "Failed to update primary identity",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/identities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identities"] });
      toast({
        title: "Success",
        description: "Identity deleted successfully",
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
        description: "Failed to delete identity",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryMutation.mutate(id);
  };

  const handleDelete = (id: string, personalName: string) => {
    if (window.confirm(`Are you sure you want to delete the identity "${personalName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getContextBadgeClass = (context: string) => {
    switch (context) {
      case "legal": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "work": return "bg-green-100 text-green-700 hover:bg-green-200";
      case "social": return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "gaming": return "bg-orange-100 text-orange-700 hover:bg-orange-200";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  const identities = (identitiesResponse as any)?.identities || [];
  const contexts = Array.from(new Set(identities.map((i: Identity) => i.context)));

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold text-primary">Namesphere</h1>
              <nav className="hidden md:flex gap-6">
                <button className="text-foreground hover:text-primary font-medium">
                  Identities
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {(user as any)?.email || "User"}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Identity Profiles</h2>
              <p className="text-muted-foreground">Manage your identities across different contexts</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-identity"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Identity
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium">Filter by context:</span>
                <Button
                  variant={selectedContext === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedContext("")}
                  data-testid="button-filter-all"
                >
                  All
                </Button>
                {contexts.map((context) => (
                  <Button
                    key={context as string}
                    variant={selectedContext === context ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedContext(context as string)}
                    className={selectedContext === context ? "" : getContextBadgeClass(context as string)}
                    data-testid={`button-filter-${context}`}
                  >
                    {context as string}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJsonView(!showJsonView)}
                  data-testid="button-toggle-view"
                >
                  <Code className="w-4 h-4 mr-2" />
                  {showJsonView ? "Card View" : "Developer View"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {identitiesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-3" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <div className="flex gap-6">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Identity Cards View */}
            {!showJsonView && (
              <div className="space-y-4" data-testid="cards-view">
                {identities.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No identities found</h3>
                      <p className="text-muted-foreground mb-4">
                        {selectedContext 
                          ? `No identities found for the "${selectedContext}" context.`
                          : "Create your first identity to get started."}
                      </p>
                      <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-identity">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Identity
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  identities.map((identity: Identity) => (
                    <IdentityCard
                      key={identity.id}
                      identity={identity}
                      onSetPrimary={handleSetPrimary}
                      onEdit={setEditingIdentity}
                      onDelete={handleDelete}
                      isSettingPrimary={setPrimaryMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))
                )}
              </div>
            )}

            {/* Developer JSON View */}
            {showJsonView && (
              <div className="space-y-6" data-testid="json-view">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      API Response: GET /identities{selectedContext ? `?context=${selectedContext}` : ''}
                    </h3>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>{JSON.stringify({ identities }, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>

                {identities.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <h4 className="font-semibold mb-3">Single Identity Request</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          GET /identities/{identities[0].id}
                        </p>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                          <pre>{JSON.stringify(identities[0], null, 2)}</pre>
                        </div>
                      </CardContent>
                    </Card>

                    {(identitiesResponse as any)?.primary && (
                      <Card>
                        <CardContent className="p-6">
                          <h4 className="font-semibold mb-3">Primary Identity Request</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            GET /identities (no context = primary first)
                          </p>
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                            <pre>{JSON.stringify({ identity: (identitiesResponse as any).primary }, null, 2)}</pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateIdentityModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {editingIdentity && (
        <EditIdentityModal
          open={!!editingIdentity}
          onOpenChange={(open) => !open && setEditingIdentity(null)}
          identity={editingIdentity}
        />
      )}
    </div>
  );
}
