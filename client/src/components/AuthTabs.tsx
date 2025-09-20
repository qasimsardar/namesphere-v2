import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";

interface AuthTabsProps {
  onSuccess?: () => void;
}

export function AuthTabs({ onSuccess }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState("login");


  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Welcome to Namesphere</CardTitle>
        <CardDescription>
          Access your identity management system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Username/Password Forms */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Sign in to your account</h3>
              <p className="text-sm text-muted-foreground">
                Enter your username and password to continue
              </p>
            </div>
            <LoginForm onSuccess={onSuccess} />
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => setActiveTab("register")}
                data-testid="link-to-register"
              >
                Sign up
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Create your account</h3>
              <p className="text-sm text-muted-foreground">
                Fill in your details to get started
              </p>
            </div>
            <RegistrationForm onSuccess={onSuccess} />
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => setActiveTab("login")}
                data-testid="link-to-login"
              >
                Sign in
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}