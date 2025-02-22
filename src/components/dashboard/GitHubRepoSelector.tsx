
import { Github, Search } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Repository {
  id: string;
  name: string;
  url: string;
}

interface GitHubRepoSelectorProps {
  onLinkRepo: (repo: Repository) => void;
  disabled?: boolean;
}

export function GitHubRepoSelector({ onLinkRepo, disabled }: GitHubRepoSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');

  const { data: repositories, isLoading } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('github', {
        method: 'GET',
      });
      
      if (error) throw error;
      console.log('GitHub repos:', data.repos); // Debug log
      return data.repos as Repository[];
    },
  });

  const filteredRepositories = repositories?.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={selectedRepoId}
        onValueChange={(value) => setSelectedRepoId(value)}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading repositories..." : "Select a repository"} />
        </SelectTrigger>
        <SelectContent>
          {filteredRepositories?.map((repo) => (
            <SelectItem key={repo.id} value={repo.id}>
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                {repo.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="w-full"
        disabled={!selectedRepoId || disabled || isLoading}
        onClick={() => {
          const repo = repositories?.find(r => r.id === selectedRepoId);
          if (repo) {
            onLinkRepo(repo);
          }
        }}
      >
        {isLoading ? "Loading..." : "Link Repository"}
      </Button>
    </div>
  );
}
