import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, Mail, Lock, LogIn, UserPlus, Loader2, CreditCard, ToggleLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Switch } from '@/components/ui/switch';

interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export default function ChittyAuth() {
  const [loginForm, setLoginForm] = useState<AuthFormData>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<AuthFormData>({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '' 
  });
  const [useChittyIdLogin, setUseChittyIdLogin] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: AuthFormData) => {
      const response = await apiRequest('POST', '/api/auth/login', {
        identifier: data.email,
        password: data.password,
        useChittyId: useChittyIdLogin
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: "Welcome back!",
        description: `Logged in with ChittyID: ${data.user.chittyId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: AuthFormData) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: "Account created!",
        description: `Welcome ${data.user.firstName || data.user.email}! Your ChittyID: ${data.user.chittyId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(registerForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ChittyAuth
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Secure authentication powered by ChittyID universal identity system
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Access ChittyID Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Switch
                      id="chitty-id-mode"
                      checked={useChittyIdLogin}
                      onCheckedChange={setUseChittyIdLogin}
                    />
                    <Label htmlFor="chitty-id-mode" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Use ChittyID Login
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-identifier" className="flex items-center gap-2">
                      {useChittyIdLogin ? (
                        <><CreditCard className="h-4 w-4" /> ChittyID</>
                      ) : (
                        <><Mail className="h-4 w-4" /> Email</>
                      )}
                    </Label>
                    <Input
                      id="login-identifier"
                      type={useChittyIdLogin ? "text" : "email"}
                      placeholder={useChittyIdLogin ? "CP-2025-XXX-XXXX-X" : "your@email.com"}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      data-testid="input-login-identifier"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      data-testid="input-login-password"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In to ChittyID
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstName">First Name</Label>
                      <Input
                        id="register-firstName"
                        placeholder="John"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                        data-testid="input-register-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastName">Last Name</Label>
                      <Input
                        id="register-lastName"
                        placeholder="Doe"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      data-testid="input-register-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      data-testid="input-register-password"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Automatic ChittyID Generation
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Your account will automatically receive a unique ChittyID (CP-YYYY-VER-XXXX-X) 
                          for universal identity verification across the ChittyOS ecosystem.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create ChittyID Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Powered by <span className="font-semibold text-blue-600">ChittyAuth</span>
            {' '}- Universal Identity Verification
          </p>
        </div>
      </div>
    </div>
  );
}