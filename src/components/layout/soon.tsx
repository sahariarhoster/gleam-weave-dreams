import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function Soon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Construction className="h-6 w-6" />
          </div>
          <div className="text-base font-semibold">{title}</div>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
          <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Coming in the next phase
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
