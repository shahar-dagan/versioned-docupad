
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DocumentationSearch } from './DocumentationSearch';
import { DocumentationNav } from './DocumentationNav';

interface Feature {
  id: string;
  name: string;
}

interface MobileNavProps {
  productId: string;
  features: Feature[] | undefined;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFeature: string | null;
  onFeatureSelect: (featureId: string) => void;
}

export function MobileNav({
  productId,
  features,
  searchQuery,
  setSearchQuery,
  selectedFeature,
  onFeatureSelect,
}: MobileNavProps) {
  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b">
      <Link to={`/products/${productId}/features`}>
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <DocumentationSearch 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <div className="px-2">
            <DocumentationNav
              features={features}
              selectedFeature={selectedFeature}
              onFeatureSelect={onFeatureSelect}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
