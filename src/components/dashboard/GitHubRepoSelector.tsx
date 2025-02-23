
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Repository } from '@/types';

interface GitHubRepoSelectorProps {
  onSelect: (repo: Repository) => void;
  isLoading?: boolean;
}

export function GitHubRepoSelector({ onSelect, isLoading }: GitHubRepoSelectorProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  const { data: repos, isLoading: isLoadingRepos } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      const data = await response.json();
      return data.map((repo: any) => ({
        id: repo.id.toString(),
        repository_name: repo.name,
        product_id: '',
        repository_url: repo.html_url,
        repository_id: repo.id.toString(),
      }));
    },
    enabled: false,
  });

  const handleRepoSelect = (value: string) => {
    setSelectedRepo(value);
    const selectedRepository = repos?.find(repo => repo.repository_name === value);
    if (selectedRepository) {
      onSelect(selectedRepository);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Select onValueChange={handleRepoSelect} value={selectedRepo}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          {repos?.map((repo) => (
            <SelectItem 
              key={repo.id} 
              value={repo.repository_name}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {repo.repository_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button disabled={!selectedRepo || isLoading}>
        {isLoading ? 'Loading...' : 'Import'}
      </Button>
    </div>
  );
}
