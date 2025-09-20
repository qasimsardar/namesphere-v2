import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ExternalLink, User } from "lucide-react";
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

interface ProfilePageProps {
  params: { identityId: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { identityId } = params;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view profiles.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Fetch public identity
  const { 
    data: identity, 
    isLoading: identityLoading, 
    error: identityError 
  } = useQuery<PublicIdentity>({
    queryKey: ["/api/public/identities", identityId],
    queryFn: async () => {
      const res = await fetch(`/api/public/identities/${identityId}`, { 
        credentials: "include" 
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      
      return res.json();
    },
    enabled: !!user && !!identityId,
    retry: false,
  });

  // Handle errors
  useEffect(() => {
    if (identityError) {
      if (isUnauthorizedError(identityError)) {
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
          title: "Profile Not Found",
          description: "This profile could not be found or is not publicly visible.",
          variant: "destructive",
        });
        setLocation("/search");
      }
    }
  }, [identityError, toast, setLocation]);

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

  const handleBack = () => {
    setLocation("/search");
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
                <button 
                  onClick={() => setLocation("/search")}
                  className="text-muted-foreground hover:text-primary font-medium"
                  data-testid="nav-search"
                >
                  Search
                </button>
                <span className="text-foreground hover:text-primary font-medium">
                  Profile
                </span>
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

      {/* Main Profile Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="pl-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </div>

        {identityLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : identity ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={identity.avatarUrl || undefined} alt={identity.personalName} />
                    <AvatarFallback className="text-2xl bg-muted">
                      {identity.personalName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h1 className="text-3xl font-bold" data-testid="profile-name">
                        {identity.personalName}
                      </h1>
                      <Badge 
                        variant="secondary" 
                        className={`${getContextBadgeClass(identity.context)} text-sm`}
                        data-testid="profile-context"
                      >
                        {identity.context}
                      </Badge>
                    </div>
                    
                    {identity.title && (
                      <p className="text-xl text-muted-foreground mb-2" data-testid="profile-title">
                        {identity.title}
                      </p>
                    )}
                    
                    {identity.pronouns && (
                      <p className="text-sm text-muted-foreground" data-testid="profile-pronouns">
                        Pronouns: {identity.pronouns}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Other Names */}
              {identity.otherNames.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Other Names</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2" data-testid="profile-other-names">
                      {identity.otherNames.map((name, index) => (
                        <div key={index} className="p-2 bg-muted rounded-md">
                          {name}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              {Object.keys(identity.socialLinks).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Social Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" data-testid="profile-social-links">
                      {Object.entries(identity.socialLinks).map(([platform, url]) => (
                        <div key={platform} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <span className="font-medium capitalize">{platform}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            data-testid={`social-link-${platform}`}
                          >
                            Visit
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Empty State for Minimal Profiles */}
            {identity.otherNames.length === 0 && Object.keys(identity.socialLinks).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Minimal Profile</h3>
                  <p className="text-muted-foreground">
                    This user has chosen to keep their {identity.context} profile minimal.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Privacy Notice */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Privacy Notice</h4>
                <p className="text-sm text-muted-foreground">
                  This profile shows only the information this user has chosen to make public 
                  for the {identity.context} context. Access to this profile has been logged 
                  for security and transparency purposes.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
              <p className="text-muted-foreground">
                This profile could not be found or is not publicly visible.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}