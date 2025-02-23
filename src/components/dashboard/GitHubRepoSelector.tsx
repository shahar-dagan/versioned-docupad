
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
import { supabase } from '@/lib/supabase';

interface GitHubRepoSelectorProps {
  onSelect: (repo: Repository) => void;
  isLoading?: boolean;
}

export function GitHubRepoSelector({ onSelect, isLoading }: GitHubRepoSelectorProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  const { data: repos, isLoading: isLoadingRepos } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      console.log('Fetching GitHub repos...');
      
      // Get the GitHub token from Supabase using the correct column name
      const { data: secretData, error: secretError } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'GITHUB_ACCESS_TOKEN')
        .single();

      if (secretError || !secretData) {
        console.error('Failed to get GitHub token:', secretError);
        throw new Error('GitHub token not configured');
      }

      const githubToken = secretData.value;
      
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('GitHub API error:', errorData);
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched repos:', data);
      
      return data.map((repo: any) => ({
        id: repo.id.toString(),
        repository_name: repo.name,
        product_id: '',
        repository_url: repo.html_url,
        repository_id: repo.id.toString(),
      }));
    },
    enabled: true,
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
        <SelectContent 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50 min-w-[280px]"
          position="popper"
          sideOffset={4}
        >
          {isLoadingRepos ? (
            <SelectItem value="loading" disabled>
              Loading repositories...
            </SelectItem>
          ) : repos && repos.length > 0 ? (
            repos.map((repo) => (
              <SelectItem 
                key={repo.id} 
                value={repo.repository_name}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                {repo.repository_name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-repos" disabled>
              No repositories found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button disabled={!selectedRepo || isLoading}>
        {isLoading ? 'Loading...' : 'Import'}
      </Button>
    </div>
  );
}
