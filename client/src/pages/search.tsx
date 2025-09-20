import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface PublicIdentity {
  id: string;
  personalName: string;
  context: string;
  title: string | null;
  pronouns: string | null;
  avatarUrl: string | null;
  socialLinks: Record<string, string>;
  otherNames: string[];
}

interface SearchResult {
  identities: PublicIdentity[];
  hasMore: boolean;
}

export default function SearchPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [searchForm, setSearchForm] = useState({
    context: "",
    query: "",
  });
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  // Search query - only run when form is submitted
  const { 
    data: searchResults, 
    isLoading: searchLoading, 
    error: searchError 
  } = useQuery<SearchResult>({
    queryKey: ["/api/public/identities/search", searchForm.context, searchForm.query],
    queryFn: async () => {
      if (!searchForm.context) {
        throw new Error("Context is required");
      }
      
      const params = new URLSearchParams({
        context: searchForm.context,
        limit: "20",
      });
      
      if (searchForm.query.trim()) {
        params.append("q", searchForm.query.trim());
      }
      
      const res = await fetch(`/api/public/identities/search?${params}`, { 
        credentials: "include" 
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      
      return res.json();
    },
    enabled: !!user && searchSubmitted && !!searchForm.context,
    retry: false,
  });

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchForm.context) {
      toast({
        title: "Context Required",
        description: "Please select a context to search within",
        variant: "destructive",
      });
      return;
    }
    
    setSearchSubmitted(true);
  };

  // Handle search error
  if (searchError && searchSubmitted) {
    if (isUnauthorizedError(searchError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    } else {
      toast({
        title: "Search Error",
        description: "Failed to search identities. Please try again.",
        variant: "destructive",
      });
    }
  }

  const getContextBadgeClass = (context: string) => {
    switch (context) {
      case "legal": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "work": return "bg-green-100 text-green-700 hover:bg-green-200";
      case "social": return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "gaming": return "bg-orange-100 text-orange-700 hover:bg-orange-200";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleViewProfile = (identityId: string) => {
    setLocation(`/profiles/${identityId}`);
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

  const identities = searchResults?.identities || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold text-primary">Namesphere</h1>
              <nav className="hidden md:flex gap-6">
                <button 
                  onClick={() => setLocation("/")}
                  className="text-muted-foreground hover:text-primary font-medium"
                  data-testid="nav-dashboard"
                >
                  Identities
                </button>
                <button className="text-foreground hover:text-primary font-medium">
                  Search
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

      {/* Main Search Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Search Identities</h2>
          <p className="text-muted-foreground">
            Find other users' public profiles within specific contexts
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="context">Context *</Label>
                  <Select 
                    value={searchForm.context} 
                    onValueChange={(value) => setSearchForm(prev => ({ ...prev, context: value }))}
                  >
                    <SelectTrigger data-testid="select-context">
                      <SelectValue placeholder="Select context" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="query">Search Term</Label>
                  <Input
                    id="query"
                    placeholder="Enter name, title, or keywords..."
                    value={searchForm.query}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, query: e.target.value }))}
                    data-testid="input-search-query"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button type="submit" className="w-full" data-testid="button-search">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchSubmitted && (
          <>
            {searchLoading ? (
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
              <div className="space-y-4" data-testid="search-results">
                {identities.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No identities found</h3>
                      <p className="text-muted-foreground">
                        No public identities found for "{searchForm.context}" context
                        {searchForm.query && ` matching "${searchForm.query}"`}.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Found {identities.length} result{identities.length !== 1 ? 's' : ''} 
                        in {searchForm.context} context
                      </p>
                    </div>
                    {identities.map((identity) => (
                      <Card key={identity.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold" data-testid={`identity-name-${identity.id}`}>
                                  {identity.personalName}
                                </h3>
                                <Badge 
                                  variant="secondary" 
                                  className={getContextBadgeClass(identity.context)}
                                  data-testid={`badge-context-${identity.id}`}
                                >
                                  {identity.context}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 text-sm text-muted-foreground">
                                {identity.title && (
                                  <p data-testid={`identity-title-${identity.id}`}>
                                    <span className="font-medium">Title:</span> {identity.title}
                                  </p>
                                )}
                                {identity.pronouns && (
                                  <p data-testid={`identity-pronouns-${identity.id}`}>
                                    <span className="font-medium">Pronouns:</span> {identity.pronouns}
                                  </p>
                                )}
                                {identity.otherNames.length > 0 && (
                                  <p data-testid={`identity-other-names-${identity.id}`}>
                                    <span className="font-medium">Other names:</span> {identity.otherNames.join(", ")}
                                  </p>
                                )}
                                {Object.keys(identity.socialLinks).length > 0 && (
                                  <div>
                                    <span className="font-medium">Social links:</span>
                                    <div className="flex gap-2 mt-1">
                                      {Object.entries(identity.socialLinks).map(([platform, url]) => (
                                        <a
                                          key={platform}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                          data-testid={`social-link-${identity.id}-${platform}`}
                                        >
                                          {platform}
                                          <ExternalLink className="w-3 h-3 inline ml-1" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              onClick={() => handleViewProfile(identity.id)}
                              data-testid={`button-view-profile-${identity.id}`}
                            >
                              View Profile
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {!searchSubmitted && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search for Identities</h3>
              <p className="text-muted-foreground">
                Select a context and enter search terms to find public identity profiles.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}