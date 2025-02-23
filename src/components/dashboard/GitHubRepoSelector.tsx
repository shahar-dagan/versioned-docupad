
import { Github } from 'lucide-react';
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
  onSelect: (repo: Repository) => void;
  disabled?: boolean;
}

export function GitHubRepoSelector({ onSelect, disabled }: GitHubRepoSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');

  const { data: repositories } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('github', {
        method: 'GET',
      });
      
      if (error) throw error;
      return data.repos as Repository[];
    },
  });

  const filteredRepositories = repositories?.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search repositories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Select
        value={selectedRepoId}
        onValueChange={(value) => setSelectedRepoId(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>
        <SelectContent className="bg-white">
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
        disabled={!selectedRepoId || disabled}
        onClick={() => {
          const repo = repositories?.find(r => r.id === selectedRepoId);
          if (repo) {
            onSelect(repo);
          }
        }}
      >
        Link Repository
      </Button>
    </div>
  );
}
