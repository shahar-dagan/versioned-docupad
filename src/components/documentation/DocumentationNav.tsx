
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  name: string;
}

interface DocumentationNavProps {
  features: Feature[] | undefined;
  selectedFeature: string | null;
  onFeatureSelect: (featureId: string) => void;
}

export function DocumentationNav({ features, selectedFeature, onFeatureSelect }: DocumentationNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto p-4">
      {features?.map((feature) => (
        <button
          key={feature.id}
          onClick={() => onFeatureSelect(feature.id)}
          className={cn(
            "w-full text-left px-4 py-2 rounded-md mb-1 hover:bg-slate-100",
            selectedFeature === feature.id && "bg-slate-100 font-medium"
          )}
        >
          {feature.name}
        </button>
      ))}
    </nav>
  );
}
