
import { BookOpen, Git, Brain, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Git,
    title: "Version Control Aware",
    description: "Automatically tracks and documents changes as your codebase evolves"
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Intelligent understanding of code changes and their implications"
  },
  {
    icon: RefreshCw,
    title: "Auto-Updating",
    description: "Documentation stays in sync with your code, eliminating manual updates"
  },
  {
    icon: BookOpen,
    title: "Dual Documentation",
    description: "Generates both technical and user-friendly documentation"
  }
];

export const Features = () => {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            The next generation of documentation
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Leverage the power of AI and version control to keep your documentation
            always up to date and accurate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 bg-background rounded-lg border hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
