
import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

export const Hero = () => {
  const { user } = useAuth();
  
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-background z-0" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-primary/5 text-primary mb-8 animate-fade-in">
          Introducing the future of documentation
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
          Documentation that writes itself
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "400ms" }}>
          Automatically generate and update documentation from your codebase.
          Version-aware, AI-powered, and always in sync with your code.
        </p>
        
        <div className="flex items-center justify-center gap-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
          {!user ? (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started <LogIn className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View Docs <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-input bg-background hover:bg-secondary transition-colors"
          >
            View Demo
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 -bottom-40 bg-gradient-to-t from-background to-transparent h-40 z-20" />
    </div>
  );
};
