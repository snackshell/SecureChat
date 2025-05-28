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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-12 pb-8 px-8">
          {/* Logo Section */}
          <div className="text-center mb-10">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              ClassChat
            </h1>
            <p className="text-slate-600 text-sm font-medium">Connect with your classmates instantly</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-12 pl-4 pr-4 border-2 border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 hover:border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Group Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter group password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 pl-4 pr-4 border-2 border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 hover:border-slate-300"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:transform-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Chat'
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p className="font-semibold mb-2 text-slate-700 text-sm flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Access Info
            </p>
            <p className="text-slate-600 text-sm">
              • Group Password: <code className="bg-white text-blue-600 px-3 py-1 rounded-lg font-mono font-semibold border border-blue-200">2025</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
