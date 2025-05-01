import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthState, User, UserRole } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  authState: AuthState;
  login: (email: string, password: string, userType?: UserRole) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: UserRole, organization?: string) => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock user data for development
const MOCK_USERS: Record<string, User> = {
  'admin@example.com': {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    organization: 'MediTrack System Admin',
  },
  'user@example.com': {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    role: 'user',
    organization: 'Test Organization',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Try to get session from Supabase first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        if (session && mounted) {
          // Fetch user profile with a separate timeout
          const profileResult = await Promise.race([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
            )
          ]);
          
          const { data: profile, error: profileError } = profileResult as { data: any; error: any };
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            // Don't throw error here, continue with session data
          }
          
          const user: User = {
            id: session.user.id,
            name: profile?.name || session.user.email?.split('@')[0] || '',
            email: session.user.email || '',
            role: (profile?.role as UserRole) || 'user',
            organization: profile?.organization || '',
            avatar: profile?.avatar || '',
            phone: profile?.phone || '',
            address: profile?.address || '',
          };
          
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          // Only show the toast if we're not in development mode
          if (process.env.NODE_ENV !== 'development') {
            toast({
              title: "Connection error",
              description: "Please check your internet connection and try again.",
              variant: "destructive",
            });
          }
        }
      }
    };
    
    initializeAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session) {
          try {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              // Continue with session data
            }
            
            const user: User = {
              id: session.user.id,
              name: profile?.name || session.user.email?.split('@')[0] || '',
              email: session.user.email || '',
              role: (profile?.role as UserRole) || 'user',
              organization: profile?.organization || '',
              avatar: profile?.avatar || '',
              phone: profile?.phone || '',
              address: profile?.address || '',
            };
            
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            console.error('Profile fetch error:', error);
            // Still set the user as authenticated with basic session data
            setAuthState({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || '',
                role: 'user',
                organization: '',
              },
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [toast]);

  const login = async (email: string, password: string, userType: UserRole = 'user') => {
    try {
      // Special case for admin login with hardcoded credentials
      if (userType === 'admin' && email === 'ayushdonga111@gmail.com' && password === 'ayush111') {
        // Create a mock admin user object
        const adminUser: User = {
          id: 'admin-id',
          name: 'Admin User',
          email: 'ayushdonga111@gmail.com',
          role: 'admin',
          organization: 'MediTrack System Admin',
        };
        
        // Set authentication state
        setAuthState({
          user: adminUser,
          isAuthenticated: true,
          isLoading: false,
        });
        
        toast({
          title: "Admin login successful",
          description: "Welcome to MediTrack Admin Dashboard",
        });
        
        return;
      }
      
      // Regular supabase authentication for non-admin users
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Verify user role
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          // Fallback to mock data
          const mockUser = MOCK_USERS[email];
          if (mockUser) {
            setAuthState({
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
            });
            toast({
              title: "Login successful",
              description: `Welcome back to MediTrack`,
            });
            return;
          }
          throw new Error('Error fetching profile');
        }
        
        // Check if role matches requested role
        if (profile.role !== userType) {
          // Sign out if role doesn't match
          await supabase.auth.signOut();
          throw new Error(`Invalid role. This account is not registered as a ${userType}.`);
        }
        
        toast({
          title: "Login successful",
          description: `Welcome back to MediTrack`,
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole, organization?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            organization,
          },
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name,
              role,
              organization,
            },
          ]);
          
        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Fallback to mock data
          const mockUser: User = {
            id: data.user.id,
            name,
            email,
            role,
            organization: organization || '',
          };
          
          setAuthState({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast({
            title: "Registration successful",
            description: "Welcome to MediTrack!",
          });
          return;
        }
        
        toast({
          title: "Registration successful",
          description: "Welcome to MediTrack!",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "There was an error creating your account",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!authState.user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', authState.user.id);
        
      if (error) throw error;
      
      setAuthState(prev => ({
        ...prev,
        user: {
          ...prev.user!,
          ...profileData,
        },
      }));
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      authState,
      login,
      logout,
      register,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
