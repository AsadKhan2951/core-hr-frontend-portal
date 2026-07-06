import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Layers, Briefcase, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COMPANY_ID = 1;

export default function OrgPage() {
  const [companyId] = useMemo(() => [DEFAULT_COMPANY_ID], []);

  const { data: companies, isLoading: companiesLoading } = trpc.org.listCompanies.useQuery();
  const { data: locations, isLoading: locationsLoading } = trpc.org.listLocations.useQuery({ companyId });
  const { data: departments, isLoading: deptsLoading } = trpc.org.listDepartments.useQuery({ companyId });
  const { data: designations, isLoading: desigLoading } = trpc.org.listDesignations.useQuery({ companyId });

  const sections = [
    {
      title: "Companies",
      icon: Building2,
      href: "/org/companies",
      count: companies?.length ?? 0,
      loading: companiesLoading,
      description: "Manage multi-tenant company entities",
    },
    {
      title: "Locations",
      icon: MapPin,
      href: "/org/locations",
      count: locations?.length ?? 0,
      loading: locationsLoading,
      description: "Office locations and geo-fence settings",
    },
    {
      title: "Departments",
      icon: Layers,
      href: "/org/departments",
      count: departments?.length ?? 0,
      loading: deptsLoading,
      description: "Department hierarchy and heads",
    },
    {
      title: "Designations",
      icon: Briefcase,
      href: "/org/designations",
      count: designations?.length ?? 0,
      loading: desigLoading,
      description: "Job titles and grade levels",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Org Structure</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organisation's hierarchy — companies, locations, departments, and designations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base mb-1">{s.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mb-3">{s.description}</p>
                  {s.loading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{s.count}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
