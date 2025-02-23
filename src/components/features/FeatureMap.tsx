
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

export function FeatureMap({ features, onUpdate }: FeatureMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Convert features to nodes and edges
    const featureNodes: Node[] = features.map((feature, index) => ({
      id: feature.id,
      type: 'default',
      data: { 
        label: feature.name,
        description: feature.description 
      },
      position: { 
        x: Math.cos(index * (2 * Math.PI / features.length)) * 250 + 400,
        y: Math.sin(index * (2 * Math.PI / features.length)) * 250 + 300
      },
      style: {
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        width: 150,
      },
    }));

    // Create edges based on technical_docs dependencies
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
              style: { stroke: '#9e86ed' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#9e86ed',
              },
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
        
        toast.success('Dependency added successfully');
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
      style: { stroke: '#9e86ed' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#9e86ed',
      },
    }, eds));
  }, [features, onUpdate]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      attributionPosition="bottom-right"
    >
      <Controls />
      <MiniMap />
      <Background />
    </ReactFlow>
  );
}
