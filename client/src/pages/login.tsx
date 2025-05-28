import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const result = await login(username.trim(), password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border border-border">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-card-foreground mb-3">Welcome to ClassChat</h1>
            <p className="text-gray-300 text-sm">Enter your credentials to join the group</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-card-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-input border-border text-white placeholder-gray-400 h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-card-foreground">Group Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter group password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-input border-border text-white placeholder-gray-400 h-12"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Chat'
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-gray-600 rounded-lg border border-gray-500">
            <p className="font-medium mb-2 text-gray-200 text-sm">Access Info:</p>
            <p className="text-gray-300 text-sm">• Group Password: <code className="bg-gray-700 text-gray-200 px-2 py-1 rounded font-mono">2025</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
