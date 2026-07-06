import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {description ?? "This module will be built in the next phase. The foundation is ready."}
      </p>
    </div>
  );
}

export default PlaceholderPage;
