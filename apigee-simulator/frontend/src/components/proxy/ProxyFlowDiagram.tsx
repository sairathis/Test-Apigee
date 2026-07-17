import { useMemo } from "react";
import ReactFlow, { Background, Node, Edge, MarkerType, Position } from "reactflow";
import "reactflow/dist/style.css";
import { Box } from "@mui/material";

const CATEGORY_COLORS: Record<string, string> = {
  Security: "#1a73e8",
  "Traffic Management": "#f9ab00",
  Mediation: "#673ab7",
  Transformation: "#1e8e3e",
  Extension: "#d93025",
};

export interface FlowDiagramPolicy {
  name: string;
  type: string;
  category: string;
  enabled: boolean;
}

export default function ProxyFlowDiagram({
  preFlowPolicies,
  postFlowPolicies,
  targetName,
  onNodeClick,
}: {
  preFlowPolicies: FlowDiagramPolicy[];
  postFlowPolicies: FlowDiagramPolicy[];
  targetName: string;
  onNodeClick?: (policyName: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let y = 0;
    const step = 90;
    const centerX = 250;

    function addNode(id: string, label: string, color: string, isPolicy = false) {
      nodes.push({
        id,
        position: { x: centerX, y },
        data: { label },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          border: `2px solid ${color}`,
          borderRadius: isPolicy ? 8 : 20,
          padding: 8,
          background: "#fff",
          fontSize: 12.5,
          fontWeight: 600,
          width: 190,
          textAlign: "center",
          color: "#202124",
          cursor: isPolicy ? "pointer" : "default",
          whiteSpace: "pre-line",
        },
      });
      if (nodes.length > 1) {
        const prev = nodes[nodes.length - 2];
        edges.push({ id: `${prev.id}-${id}`, source: prev.id, target: id, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#9aa0a6" } });
      }
      y += step;
    }

    addNode("client", "Client", "#5f6368");
    preFlowPolicies
      .filter((p) => p.enabled)
      .forEach((p) => addNode(`pre-${p.name}`, `${p.name}\n(${p.type})`, CATEGORY_COLORS[p.category] || "#5f6368", true));
    addNode("target", `Target Endpoint\n${targetName}`, "#202124");
    postFlowPolicies
      .filter((p) => p.enabled)
      .forEach((p) => addNode(`post-${p.name}`, `${p.name}\n(${p.type})`, CATEGORY_COLORS[p.category] || "#5f6368", true));
    addNode("response", "Response", "#5f6368");

    return { nodes, edges };
  }, [preFlowPolicies, postFlowPolicies, targetName]);

  return (
    <Box sx={{ height: 480, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "#fafbfc" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("pre-") || node.id.startsWith("post-")) {
            const name = node.id.replace(/^pre-|^post-/, "");
            onNodeClick?.(name);
          }
        }}
      >
        <Background gap={16} color="#e8eaed" />
      </ReactFlow>
    </Box>
  );
}
