
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-6">
          <div className="flex items-center text-primary space-x-2">
            <Pill className="h-8 w-8" />
            <span className="text-2xl font-bold">DrugFlow Guardian</span>
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-foreground mb-6">Oops! The page you're looking for couldn't be found.</p>
        <p className="text-muted-foreground mb-8">
          The page you are trying to access might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <Link to="/" className="inline-block">
          <Button size="lg">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
