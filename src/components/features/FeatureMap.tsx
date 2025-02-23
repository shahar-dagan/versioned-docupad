
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
  featureGroups: Map<string, Feature[]>;
  onUpdate: () => void;
}

// Color mapping for different feature types
const typeColors = {
  user_action: '#22c55e',  // green
  display: '#3b82f6',      // blue
  navigation: '#8b5cf6',   // purple
  feedback: '#f59e0b',     // amber
  form: '#ec4899',         // pink
  default: '#6b7280'       // gray
};

const nodeTypes = {
  feature: ({ data }: { data: { label: string; description?: string; type?: string } }) => (
    <div className={`bg-white p-4 rounded-lg border-2 shadow-sm`} 
         style={{ borderColor: typeColors[data.type as keyof typeof typeColors] || typeColors.default }}>
      <div className="font-medium text-sm">{data.label}</div>
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
          {data.description}
        </div>
      )}
      {data.type && (
        <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
             style={{ backgroundColor: typeColors[data.type as keyof typeof typeColors] || typeColors.default, color: 'white' }}>
          {data.type}
        </div>
      )}
    </div>
  ),
};

export function FeatureMap({ features, featureGroups, onUpdate }: FeatureMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    let yOffset = 0;

    // Create nodes grouped by directory
    featureGroups.forEach((groupFeatures, directory) => {
      const groupWidth = Math.min(groupFeatures.length * 300, 1200);
      const columns = Math.ceil(groupFeatures.length / 3);
      
      groupFeatures.forEach((feature, index) => {
        const xPos = (index % columns) * 300 + 100;
        const yPos = yOffset + Math.floor(index / columns) * 150;
        
        initialNodes.push({
          id: feature.id,
          type: 'feature',
          data: { 
            label: feature.name,
            description: feature.description,
            type: feature.technical_docs?.type || 'default'
          },
          position: { x: xPos, y: yPos },
          style: { width: 250 },
        });

        // Create edges based on dependencies
        if (feature.technical_docs?.dependencies) {
          feature.technical_docs.dependencies.forEach(dep => {
            const targetFeature = features.find(f => f.name === dep);
            if (targetFeature) {
              initialEdges.push({
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

      yOffset += Math.ceil(groupFeatures.length / columns) * 150 + 100;
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [features, featureGroups]);

  const onConnect = useCallback(async (params: any) => {
    const sourceFeature = features.find(f => f.id === params.source);
    const targetFeature = features.find(f => f.id === params.target);

    if (!sourceFeature || !targetFeature) return;

    try {
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
        nodeColor={(node) => {
          const type = (node.data?.type as keyof typeof typeColors) || 'default';
          return typeColors[type] || typeColors.default;
        }}
        nodeBorderRadius={8}
      />
      <Background color="#aaa" gap={16} />
    </ReactFlow>
  );
}
