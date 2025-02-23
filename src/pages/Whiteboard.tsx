
import { useParams } from 'react-router-dom';
import { useFeatures } from '@/hooks/useFeatures';
import { useAuth } from '@/hooks/useAuth';
import { FeatureMap } from '@/components/features/FeatureMap';

const PREDEFINED_FEATURES = [
  // Product Management Group
  {
    id: 'pm-1',
    name: 'Create new products',
    description: 'Create and set up new products in the system',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: [] }
  },
  {
    id: 'pm-2',
    name: 'Delete existing products',
    description: 'Remove products from the system',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Create new products'] }
  },
  {
    id: 'pm-3',
    name: 'View product list',
    description: 'See all products in a list view',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Create new products'] }
  },
  {
    id: 'pm-4',
    name: 'Add descriptions to products',
    description: 'Add and edit product descriptions',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Create new products'] }
  },
  {
    id: 'pm-5',
    name: 'Link GitHub repositories',
    description: 'Connect GitHub repositories to products',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Create new products'] }
  },

  // Feature Tracking Group
  {
    id: 'ft-1',
    name: 'Add features to products',
    description: 'Create and add new features to products',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Create new products'] }
  },
  {
    id: 'ft-2',
    name: 'View features list',
    description: 'See all features for a product',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Add features to products'] }
  },
  {
    id: 'ft-3',
    name: 'Track feature status',
    description: 'Monitor and update feature status',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Add features to products'] }
  },
  {
    id: 'ft-4',
    name: 'View feature details',
    description: 'See detailed information about features',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Add features to products'] }
  },
  {
    id: 'ft-5',
    name: 'Document feature changes',
    description: 'Record changes made to features',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Add features to products', 'Track feature status'] }
  },
  {
    id: 'ft-6',
    name: 'Analyze repository for features',
    description: 'Automatically detect features from code',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Link GitHub repositories'] }
  },

  // Documentation Group
  {
    id: 'doc-1',
    name: 'View auto-generated documentation',
    description: 'Access automatically generated documentation',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Document feature changes', 'Analyze repository for features'] }
  },
  {
    id: 'doc-2',
    name: 'Navigate documentation by feature',
    description: 'Browse documentation organized by feature',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View auto-generated documentation'] }
  },
  {
    id: 'doc-3',
    name: 'Search documentation',
    description: 'Find specific documentation content',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View auto-generated documentation'] }
  },
  {
    id: 'doc-4',
    name: 'View technical documentation',
    description: 'Access technical implementation details',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View auto-generated documentation'] }
  },
  {
    id: 'doc-5',
    name: 'View user documentation',
    description: 'Access user-focused documentation',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View auto-generated documentation'] }
  },

  // Auth & User Management Group
  {
    id: 'auth-1',
    name: 'Sign up with email',
    description: 'Create a new account using email',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: [] }
  },
  {
    id: 'auth-2',
    name: 'Sign in with email',
    description: 'Log in to existing account',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Sign up with email'] }
  },
  {
    id: 'auth-3',
    name: 'View dashboard',
    description: 'Access the main dashboard',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Sign in with email'] }
  },
  {
    id: 'auth-4',
    name: 'Manage profile',
    description: 'Update user profile information',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Sign in with email'] }
  },

  // Repository Integration Group
  {
    id: 'repo-1',
    name: 'Track code changes',
    description: 'Monitor changes in the codebase',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Link GitHub repositories'] }
  },
  {
    id: 'repo-2',
    name: 'View change history',
    description: 'See history of code changes',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Track code changes'] }
  },

  // Team Collaboration Group
  {
    id: 'team-1',
    name: 'View team members',
    description: 'See all members of the team',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['Sign in with email'] }
  },
  {
    id: 'team-2',
    name: 'See project statistics',
    description: 'View project metrics and stats',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View dashboard'] }
  },
  {
    id: 'team-3',
    name: 'Track team activity',
    description: 'Monitor team actions and changes',
    status: 'active',
    created_at: new Date().toISOString(),
    last_analyzed_at: new Date().toISOString(),
    technical_docs: { dependencies: ['View team members', 'See project statistics'] }
  }
];

export default function Whiteboard() {
  const { productId } = useParams<{ productId: string }>();
  const { authData } = useAuth();

  if (!authData) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Please log in to view the whiteboard
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <FeatureMap 
        features={PREDEFINED_FEATURES} 
        onUpdate={() => {}} // No updates needed for predefined features
      />
    </div>
  );
}
