import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { authState } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [showTimeout, setShowTimeout] = useState(false);
  
  const { user, isAuthenticated, isLoading } = authState;
  
  useEffect(() => {
    // Set a timeout to show a different message if loading takes too long
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowTimeout(true);
      }
    }, 5000); // Show timeout message after 5 seconds

    return () => clearTimeout(timeoutId);
  }, [isLoading]);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Access denied",
        description: "Please log in to continue",
        variant: "destructive",
      });
    } else if (!isLoading && adminOnly && user?.role !== 'admin') {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
    }
  }, [isLoading, isAuthenticated, adminOnly, user, toast]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        {showTimeout ? (
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Taking longer than expected...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please try refreshing the page if this persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Redirect to user dashboard if user is not admin but trying to access admin route
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/user/dashboard" replace />;
  }
  
  // Render children if all conditions are met
  return <>{children}</>;
};

export default ProtectedRoute;
