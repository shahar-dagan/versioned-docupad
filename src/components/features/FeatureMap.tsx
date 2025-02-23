
import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import { Feature } from '@/types';
import 'reactflow/dist/style.css';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface FeatureMapProps {
  features: Feature[];
  onUpdate: () => void;
}

const nodeTypes = {
  feature: ({ data }: { data: { label: string; description?: string } }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="font-medium text-sm">{data.label}</div>
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
          {data.description}
        </div>
      )}
    </div>
  ),
};

export function FeatureMap({ features, onUpdate }: FeatureMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Create a map for quick lookup of node positions
    const nodePositions = new Map();
    
    // First pass: Create nodes with hierarchical layout
    const featureNodes: Node[] = features.map((feature, index) => {
      // Find the number of dependencies this feature has
      const dependencyCount = feature.technical_docs?.dependencies?.length || 0;
      
      // Position nodes based on their dependencies
      const position = {
        x: dependencyCount * 300 + 100, // More dependencies = more to the right
        y: index * 150 + 50, // Spread vertically
      };
      
      nodePositions.set(feature.id, position);
      
      return {
        id: feature.id,
        type: 'feature',
        data: { 
          label: feature.name,
          description: feature.description 
        },
        position,
        style: {
          width: 220,
        },
      };
    });

    // Second pass: Create edges with proper connections
    const featureEdges: Edge[] = [];
    features.forEach(feature => {
      if (feature.technical_docs?.dependencies) {
        feature.technical_docs.dependencies.forEach(dep => {
          const targetFeature = features.find(f => f.name === dep);
          if (targetFeature) {
            featureEdges.push({
              id: `${feature.id}-${targetFeature.id}`,
              source: feature.id,
              target: targetFeature.id,
              animated: true,
              style: { stroke: '#9e86ed', strokeWidth: 2 },
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#9e86ed',
                width: 20,
                height: 20,
              },
              label: 'depends on',
              labelStyle: { fill: '#666', fontSize: 12 },
              labelBgStyle: { fill: '#fff' },
            });
          }
        });
      }
    });

    setNodes(featureNodes);
    setEdges(featureEdges);
  }, [features, setNodes, setEdges]);

  const onConnect = useCallback(async (params: any) => {
    // Find the source and target features
    const sourceFeature = features.find(f => f.id === params.source);
    const targetFeature = features.find(f => f.id === params.target);

    if (!sourceFeature || !targetFeature) return;

    try {
      // Update the source feature's dependencies
      const dependencies = sourceFeature.technical_docs?.dependencies || [];
      if (!dependencies.includes(targetFeature.name)) {
        const { error } = await supabase
          .from('features')
          .update({
            technical_docs: {
              ...sourceFeature.technical_docs,
              dependencies: [...dependencies, targetFeature.name]
            }
          })
          .eq('id', sourceFeature.id);

        if (error) throw error;
        
        toast.success(`Added dependency: ${sourceFeature.name} → ${targetFeature.name}`);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating dependencies:', error);
      toast.error('Failed to update dependencies');
      return;
    }

    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#9e86ed', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#9e86ed',
        width: 20,
        height: 20,
      },
      label: 'depends on',
      labelStyle: { fill: '#666', fontSize: 12 },
      labelBgStyle: { fill: '#fff' },
    }, eds));
  }, [features, onUpdate]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-right"
      minZoom={0.1}
      maxZoom={1.5}
      defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
    >
      <Controls />
      <MiniMap 
        nodeStrokeColor="#666"
        nodeColor="#fff"
        nodeBorderRadius={8}
      />
      <Background color="#aaa" gap={16} />
    </ReactFlow>
  );
}
