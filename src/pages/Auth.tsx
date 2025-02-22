
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  // Redirect if user is already logged in
  if (user) {
    console.log('User is already logged in:', user);
    return <Navigate to="/" replace />;
  }

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
      
      // More specific error messages
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
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleSubmit('login')}>
                Sign In
              </Button>
            </CardFooter>
          </TabsContent>
          <TabsContent value="signup">
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleSubmit('signup')}>
                Create Account
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
