
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
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      const githubToken = session?.provider_token;
      console.log('Session state:', {
        hasSession: !!session,
        hasProviderToken: !!githubToken,
        provider: session?.user?.app_metadata?.provider
      });

      if (!githubToken) {
        throw new Error('GitHub not connected');
      }
      
      try {
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
        console.log('Successfully fetched repos:', data.length);
        
        return data.map((repo: any) => ({
          id: repo.id.toString(),
          repository_name: repo.name,
          product_id: '',
          repository_url: repo.html_url,
          repository_id: repo.id.toString(),
        }));
      } catch (error) {
        console.error('Error fetching repos:', error);
        throw error;
      }
    },
    enabled: !!user,
    retry: false,
  });

  const handleConnectGitHub = async () => {
    try {
      // Get the current URL but ensure we're using the correct preview URL format
      const currentUrl = window.location.href;
      const redirectUrl = currentUrl.includes('lovable.app') 
        ? currentUrl.replace('id-preview--', '')
        : currentUrl;

      console.log('Starting GitHub OAuth with redirect to:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
          scopes: 'repo',
          queryParams: {
            access_type: 'offline',
          },
        },
      });

      if (error) {
        console.error('GitHub OAuth error:', error);
        throw error;
      }

      if (!data.url) {
        throw new Error('No URL returned from OAuth provider');
      }

      console.log('Redirecting to GitHub OAuth URL:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast.error('Failed to connect to GitHub. Please try again.');
    }
  };

  // Show error toast when query fails
  if (error) {
    console.error('Error in repo query:', error);
    return (
      <div className="flex items-center gap-4">
        <Button onClick={handleConnectGitHub} variant="default">
          Connect GitHub Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Select onValueChange={(value) => {
        setSelectedRepo(value);
        const selectedRepository = repos?.find(repo => repo.repository_name === value);
        if (selectedRepository) {
          onSelect(selectedRepository);
        }
      }} value={selectedRepo}>
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
