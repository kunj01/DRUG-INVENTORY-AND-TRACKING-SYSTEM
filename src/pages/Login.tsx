import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Pill, Stethoscope, Heart, Syringe, Thermometer, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['user', 'admin'])
});

type FormValues = z.infer<typeof formSchema>;

// Update the background styles to be more minimal and soothing
const backgroundStyles = `
  @keyframes gentle-float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  .login-background {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    z-index: -1;
  }

  .background-icon {
    position: absolute;
    color: rgba(59, 130, 246, 0.05);
    animation: gentle-float 8s ease-in-out infinite;
    transition: all 0.6s ease;
  }

  .background-icon:nth-child(1) {
    color: rgba(37, 99, 235, 0.05);
  }

  .background-icon:nth-child(2) {
    color: rgba(59, 130, 246, 0.05);
  }

  .background-icon:nth-child(3) {
    color: rgba(96, 165, 250, 0.05);
  }

  .background-icon:nth-child(4) {
    color: rgba(147, 197, 253, 0.05);
  }

  .background-icon:hover {
    transform: scale(1.1);
    filter: brightness(1.5);
  }

  .login-container {
    position: relative;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 24px;
    padding: 2rem;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.1);
  }

  .card-glow {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(59, 130, 246, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .card-glow:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.2);
  }

  .brand-title {
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }

  .tab-content {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(59, 130, 246, 0.1);
  }

  .submit-button {
    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
    transition: all 0.3s ease !important;
  }

  .submit-button:hover {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  .submit-button:disabled {
    opacity: 0.5;
    transform: none;
  }

  .form-label {
    color: #e2e8f0 !important;
  }

  .form-input {
    background: rgba(30, 41, 59, 0.7) !important;
    border-color: rgba(59, 130, 246, 0.2) !important;
    color: #e2e8f0 !important;
  }

  .form-input:focus {
    border-color: rgba(59, 130, 246, 0.5) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
  }

  .form-input::placeholder {
    color: #64748b !important;
  }
`;

// Add the style tag to the document
const styleSheet = document.createElement("style");
styleSheet.innerText = backgroundStyles;
document.head.appendChild(styleSheet);

// Background icon component
const BackgroundIcon = ({ Icon, style }: { Icon: any; style: React.CSSProperties }) => (
  <div className="background-icon" style={style}>
    <Icon size={48} />
  </div>
);

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, authState } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'user' | 'admin'>('user');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      userType: 'user'
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !authState.isLoading) {
      if (authState.user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    }
  }, [authState, navigate]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For admin, enforce specific credentials
      if (data.userType === 'admin') {
        if (data.email !== 'ayushdonga111@gmail.com' || data.password !== 'ayush111') {
          throw new Error('Invalid admin credentials. Please contact system administrator.');
        }
      }
      
      await login(data.email, data.password, data.userType);
      
      // Redirect based on role
      if (data.userType === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setUserType(value as 'user' | 'admin');
    form.setValue('userType', value as 'user' | 'admin');
  };

  // Reduce number of background icons and update positions
  const backgroundIcons = [
    { Icon: Pill, style: { top: '15%', left: '15%' } },
    { Icon: Heart, style: { top: '25%', right: '20%' } },
    { Icon: Stethoscope, style: { bottom: '20%', left: '25%' } },
    { Icon: Syringe, style: { bottom: '35%', right: '15%' } },
  ];

  // Don't render the login form if already authenticated
  if (authState.isAuthenticated && !authState.isLoading) {
    return null;
  }

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="login-background" />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="login-background">
        {backgroundIcons.map((icon, index) => (
          <BackgroundIcon key={index} Icon={icon.Icon} style={icon.style} />
        ))}
      </div>
      
      <div className="w-full max-w-md px-4 login-container">
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <Pill className="h-8 w-8 text-blue-400" />
            <span className="text-2xl brand-title">MediTrack</span>
          </div>
        </div>
        
        <Card className="w-full card-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-medium text-gray-100">Welcome back</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/50 text-red-200 border-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="user" className="w-full mb-6" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                <TabsTrigger value="user" className="text-sm data-[state=active]:bg-blue-600">User</TabsTrigger>
                <TabsTrigger value="admin" className="text-sm data-[state=active]:bg-blue-600">Administrator</TabsTrigger>
              </TabsList>
              <TabsContent value="user">
                <div className="text-sm text-gray-300 text-center p-2 rounded-md mb-4 tab-content">
                  Access your healthcare dashboard
                </div>
              </TabsContent>
              <TabsContent value="admin">
                <div className="text-sm text-gray-300 text-center p-2 rounded-md mb-4 tab-content">
                  System administration access
                </div>
                {userType === 'admin' && (
                  <div className="text-xs text-blue-400 mb-2 text-center">
                    <strong>Demo credentials:</strong> ayushdonga111@gmail.com / ayush111
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="form-label">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          autoComplete="email"
                          className="form-input"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="form-label">Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your password"
                          type="password"
                          autoComplete="current-password"
                          className="form-input"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full submit-button" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <Link 
              to="/forgot-password" 
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              Forgot password?
            </Link>
            {userType === 'user' && (
              <Link 
                to="/register" 
                className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
              >
                Create account
              </Link>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
