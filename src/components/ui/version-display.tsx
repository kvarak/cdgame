import { Badge } from "@/components/ui/badge";

// This gets the version from build time (set in vite.config.ts)
const getVersion = (): string => {
  // Use the build-time version that's automatically set during Vite build
  const gitDescribe = __APP_VERSION__ || "v0.1-dev";
  
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