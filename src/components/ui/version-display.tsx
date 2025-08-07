import { Badge } from "@/components/ui/badge";

// This would be populated during build time from git describe
const getVersion = (): string => {
  // Placeholder - in production this would come from build process
  const gitDescribe = process.env.VITE_APP_VERSION || "v0.1-8-gf35fefa";
  
  // Convert v0.1-8-gf35fefa to v0.1.8-gf35fefa
  const formatVersion = (version: string): string => {
    // Find the first dash after the version number and replace with dot
    const match = version.match(/^(v\d+\.\d+)-(\d+)-(.+)$/);
    if (match) {
      const [, versionPart, commitCount, hash] = match;
      return `${versionPart}.${commitCount}-${hash}`;
    }
    return version; // fallback if pattern doesn't match
  };
  
  return formatVersion(gitDescribe);
};

export const VersionDisplay = () => {
  const version = getVersion();
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className="text-xs text-muted-foreground border-muted-foreground/30 font-mono"
      >
        {version}
      </Badge>
    </div>
  );
};