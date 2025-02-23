
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Github } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for error in URL params
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error('Auth error:', error, errorDescription);
      toast({
        title: "Authentication Error",
        description: errorDescription || "An error occurred during authentication",
        variant: "destructive",
      });
    }

    // Check for successful OAuth redirects
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      console.log('Received access token from OAuth redirect');
      navigate('/dashboard');
    }
  }, [searchParams, toast, navigate]);

  // If user is already logged in, redirect to dashboard
  if (user) {
    console.log('User already logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  const handleGitHubSignIn = async () => {
    try {
      console.log('Starting GitHub OAuth flow...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'repo'
        }
      });

      if (error) throw error;

      if (!data.url) {
        throw new Error('No URL returned from OAuth provider');
      }

      console.log('GitHub OAuth URL:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('GitHub sign in error:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with GitHub. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (action: 'login' | 'signup') => {
    try {
      console.log(`Attempting ${action} with email:`, email);
      
      if (action === 'login') {
        const result = await signIn(email, password);
        console.log('Sign in result:', result);
      } else {
        const result = await signUp(email, password);
        console.log('Sign up result:', result);
      }

      toast({
        title: "Success",
        description: action === 'login' ? "Successfully logged in" : "Account created successfully",
      });
    } catch (error) {
      console.error(`${action} error:`, error);
      
      let errorMessage = error instanceof Error ? error.message : "An error occurred";
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before logging in.';
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to Docs</CardTitle>
          <CardDescription>Create and manage your documentation with version control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGitHubSignIn}
          >
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleSubmit('login')}>
                  Sign In
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleSubmit('signup')}>
                  Create Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
