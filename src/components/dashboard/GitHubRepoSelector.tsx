
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
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface GitHubRepoSelectorProps {
  onSelect: (repo: Repository) => void;
  isLoading?: boolean;
}

export function GitHubRepoSelector({ onSelect, isLoading }: GitHubRepoSelectorProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const { user } = useAuth();

  const { data: repos, isLoading: isLoadingRepos, error } = useQuery({
    queryKey: ['github-repos', user?.id],
    queryFn: async () => {
      console.log('Fetching GitHub repos...');
      
      const { data: session } = await supabase.auth.getSession();
      const githubToken = session.session?.provider_token;

      if (!githubToken) {
        console.error('No GitHub token found');
        throw new Error('GitHub not connected');
      }
      
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
    enabled: !!user,
    retry: false,
    onError: (error) => {
      console.error('Error fetching repos:', error);
      toast.error('Failed to fetch GitHub repositories. Please make sure your GitHub account is connected.');
    }
  });

  const handleConnectGitHub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'repo',
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('No URL returned from OAuth provider');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast.error('Failed to connect to GitHub');
    }
  };

  const handleRepoSelect = (value: string) => {
    setSelectedRepo(value);
    const selectedRepository = repos?.find(repo => repo.repository_name === value);
    if (selectedRepository) {
      onSelect(selectedRepository);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-4">
        <Button onClick={handleConnectGitHub}>
          Connect GitHub Account
        </Button>
      </div>
    );
  }

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
