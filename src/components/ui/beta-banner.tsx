import { Badge } from "@/components/ui/badge";

export const BetaBanner = () => {
  return (
    <div className="fixed top-4 left-4 z-50">
      <Badge 
        variant="secondary" 
        className="bg-warning text-warning-foreground font-semibold px-3 py-1 text-sm shadow-md"
      >
        BETA
      </Badge>
    </div>
  );
};