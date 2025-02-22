
import { Input } from '@/components/ui/input';

interface DocumentationSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function DocumentationSearch({ searchQuery, setSearchQuery }: DocumentationSearchProps) {
  return (
    <div className="p-4 border-b">
      <Input
        placeholder="Search documentation..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
