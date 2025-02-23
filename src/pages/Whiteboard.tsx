
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

export const PREDEFINED_FEATURES = [
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

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Product Management' } },
  { id: '2', position: { x: -200, y: 100 }, data: { label: 'Create Products' } },
  { id: '3', position: { x: -200, y: 200 }, data: { label: 'Delete Products' } },
  { id: '4', position: { x: -200, y: 300 }, data: { label: 'View Product List' } },
  { id: '5', position: { x: -200, y: 400 }, data: { label: 'Add Product Descriptions' } },
  { id: '6', position: { x: 200, y: 0 }, data: { label: 'Feature Tracking' } },
  { id: '7', position: { x: 200, y: 100 }, data: { label: 'Add Features' } },
  { id: '8', position: { x: 200, y: 200 }, data: { label: 'View Features' } },
  { id: '9', position: { x: 200, y: 300 }, data: { label: 'Track Feature Status' } },
  { id: '10', position: { x: 200, y: 400 }, data: { label: 'Document Feature Changes' } },
  { id: '11', position: { x: 450, y: 0 }, data: { label: 'Documentation' } },
  { id: '12', position: { x: 450, y: 100 }, data: { label: 'View Documentation' } },
  { id: '13', position: { x: 450, y: 200 }, data: { label: 'Navigate by Feature' } },
  { id: '14', position: { x: 450, y: 300 }, data: { label: 'Search Documentation' } },
  { id: '15', position: { x: 0, y: -200 }, data: { label: 'Authentication & User Management' } },
  { id: '16', position: { x: -200, y: -300 }, data: { label: 'Sign Up' } },
  { id: '17', position: { x: -200, y: -200 }, data: { label: 'Sign In' } },
  { id: '18', position: { x: -200, y: -100 }, data: { label: 'Manage Profile' } },
  { id: '19', position: { x: 0, y: 200 }, data: { label: 'Repository Integration' } },
  { id: '20', position: { x: 0, y: 300 }, data: { label: 'Link GitHub Repositories' } },
  { id: '21', position: { x: 0, y: 400 }, data: { label: 'Analyze Repository Code' } },
  { id: '22', position: { x: 700, y: 0 }, data: { label: 'Team Collaboration' } },
  { id: '23', position: { x: 700, y: 100 }, data: { label: 'View Team Members' } },
  { id: '24', position: { x: 700, y: 200 }, data: { label: 'Project Statistics' } },
  { id: '25', position: { x: 700, y: 300 }, data: { label: 'Track Team Activity' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e1-5', source: '1', target: '5' },
  { id: 'e6-7', source: '6', target: '7' },
  { id: 'e6-8', source: '6', target: '8' },
  { id: 'e6-9', source: '6', target: '9' },
  { id: 'e6-10', source: '6', target: '10' },
  { id: 'e11-12', source: '11', target: '12' },
  { id: 'e11-13', source: '11', target: '13' },
  { id: 'e11-14', source: '11', target: '14' },
  { id: 'e15-16', source: '15', target: '16' },
  { id: 'e15-17', source: '15', target: '17' },
  { id: 'e15-18', source: '15', target: '18' },
  { id: 'e19-20', source: '19', target: '20' },
  { id: 'e19-21', source: '19', target: '21' },
  { id: 'e22-23', source: '22', target: '23' },
  { id: 'e22-24', source: '22', target: '24' },
  { id: 'e22-25', source: '22', target: '25' },
];

export default function Whiteboard() {
  const { productId } = useParams<{ productId: string }>();
  const { authData } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
