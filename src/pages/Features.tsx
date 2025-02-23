
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { FeaturesList } from "@/components/features/FeaturesList";
import { FeaturesHeader } from "@/components/features/FeaturesHeader";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/useProduct";
import { useRepository } from "@/hooks/useRepository";
import { useFeatures } from "@/hooks/useFeatures";

export default function Features() {
  const { productId } = useParams<{ productId: string }>();
  const { authData } = useAuth();
  const { product, isLoadingProduct } = useProduct(productId, !!authData);
  const { repository } = useRepository(productId, !!authData);
  const {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepository,
    isAnalyzing
  } = useFeatures(productId, !!authData && !!productId, repository);

  if (!authData) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Please log in to view features
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingProduct || isLoadingFeatures) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (featuresError) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Error loading features. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link 
              to="/dashboard" 
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link 
              to="/products" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Products
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {product?.name || "Loading..."}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Features
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto py-10">
        <FeaturesHeader
          productName={product?.name || "Loading..."}
          productId={productId || ""}
          userId={authData.user.id}
          featuresCount={features?.length || 0}
          repository={repository}
          onAnalyze={analyzeRepository}
          isAnalyzing={isAnalyzing}
          onFeatureCreated={refetch}
          features={features || []}
        />

        {isAnalyzing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Analyzing repository...</span>
              <span className="text-sm font-medium">In progress</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        <FeaturesList features={features || []} productId={productId || ""} />
      </div>
    </div>
  );
}
