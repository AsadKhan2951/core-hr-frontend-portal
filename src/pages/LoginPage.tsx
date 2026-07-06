import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, Users, GitBranch, BarChart3 } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Multi-Tenant Org Structure", desc: "Companies, locations, departments, designations" },
  { icon: Shield, title: "Role-Based Access Control", desc: "Six predefined roles with granular permissions" },
  { icon: GitBranch, title: "Approval Workflow Engine", desc: "Generic multi-step approval workflows" },
  { icon: BarChart3, title: "Audit & Compliance", desc: "Immutable audit log for every system action" },
];

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">C</span>
          </div>
          <span className="font-semibold text-foreground">CORE HR</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Shield className="h-3.5 w-3.5" />
                Foundation Release
              </div>
              <h1 className="text-4xl font-bold text-foreground leading-tight">
                Human Resources
                <span className="text-primary block">Built for Scale</span>
              </h1>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                A production-ready CORE HR foundation with multi-tenant org structure, JWT authentication,
                granular RBAC, an approval workflow engine, and a full audit trail.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Sign in to CORE HR
            </Button>
          </div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
