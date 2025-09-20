import { AuthTabs } from "@/components/AuthTabs";

export default function Landing() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600"></div>
        <div className="relative flex flex-col justify-center px-12 py-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6">Namesphere</h1>
            <p className="text-xl text-blue-100 mb-8">
              Secure identity management across contexts. Be yourself, everywhere, appropriately.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                <span className="text-blue-100">Context-aware identity profiles</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                <span className="text-blue-100">Privacy-by-design minimal disclosure</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                <span className="text-blue-100">Comprehensive audit logging</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                <span className="text-blue-100">Dual authentication support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Authentication */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden mb-8">
            <h1 className="text-3xl font-bold text-primary">Namesphere</h1>
            <p className="text-muted-foreground mt-2">Secure identity management</p>
          </div>
          
          <AuthTabs />
        </div>
      </div>
    </div>
  );
}
