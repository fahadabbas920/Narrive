"use client"

import { useCallback, useState, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnNodesDelete,
  type OnEdgesDelete,
  type OnNodeDrag,
  type OnReconnect,
  type NodeMouseHandler,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Plus } from "lucide-react"
import { ButtonUI } from "@workspace/ui/components/button-ui"
import { SceneNode, type SceneNodeData } from "./scene-node"
import { ChoiceEdge, type ChoiceEdgeData } from "./choice-edge"
import { ScenePanel } from "./scene-panel"
import { ChoiceDialog } from "./choice-dialog"
import {
  useCreateScene,
  useUpdateScene,
  useDeleteScene,
  useCreateChoice,
  useDeleteChoice,
} from "@/hooks/use-story-editor"
import type { Scene, Choice } from "@/lib/api/stories"

const nodeTypes = { scene: SceneNode }
const edgeTypes = { choice: ChoiceEdge }

interface StoryCanvasProps {
  storyId: string
  scenes: Scene[]
  choices: Choice[]
}

function scenesToNodes(scenes: Scene[], choices: Choice[]): Node[] {
  return scenes.map((scene) => ({
    id: scene.id,
    type: "scene",
    position: { x: scene.position_x, y: scene.position_y },
    data: {
      title: scene.title,
      scene_type: scene.scene_type,
      content: scene.content,
      choiceCount: choices.filter((c) => c.from_scene_id === scene.id).length,
    } satisfies SceneNodeData,
  }))
}

function choicesToEdges(
  choices: Choice[],
  onEdgeEdit: (choice: Choice) => void,
  onEdgeDelete: (choiceId: string) => void,
): Edge[] {
  // Group choices that connect the same pair of scenes (in EITHER direction) so
  // reciprocal/parallel edges can bow into separate arcs instead of overlapping.
  const groups = new Map<string, string[]>()
  for (const c of choices) {
    const key = [c.from_scene_id, c.to_scene_id].sort().join("|")
    const arr = groups.get(key) ?? []
    arr.push(c.id)
    groups.set(key, arr)
  }

  return choices.map((choice) => {
    const key = [choice.from_scene_id, choice.to_scene_id].sort().join("|")
    const group = groups.get(key) ?? [choice.id]
    const idx = group.indexOf(choice.id)
    // 0 for a lone edge (stays orthogonal); ± for siblings (curved apart)
    const curveOffset = group.length > 1 ? (idx - (group.length - 1) / 2) * 70 : 0

    return {
      id: choice.id,
      source: choice.from_scene_id,
      target: choice.to_scene_id,
      type: "choice",
      data: {
        text: choice.text,
        onEdit: () => onEdgeEdit(choice),
        onDelete: () => onEdgeDelete(choice.id),
        curveOffset,
      } satisfies ChoiceEdgeData,
    }
  })
}

export function StoryCanvas({ storyId, scenes, choices }: StoryCanvasProps) {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [editingChoice, setEditingChoice] = useState<Choice | null>(null)

  const { mutate: createScene } = useCreateScene(storyId)
  const { mutate: updateScene } = useUpdateScene(storyId)
  const { mutate: deleteScene } = useDeleteScene(storyId)
  const { mutate: createChoice } = useCreateChoice(storyId)
  const { mutate: deleteChoice } = useDeleteChoice(storyId)

  const [nodes, setNodes, onNodesChange] = useNodesState(scenesToNodes(scenes, choices))
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    choicesToEdges(choices, setEditingChoice, deleteChoice),
  )

  useEffect(() => {
    setNodes(scenesToNodes(scenes, choices))
    setEdges(choicesToEdges(choices, setEditingChoice, deleteChoice))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, choices])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const scene = scenes.find((s) => s.id === node.id)
      if (scene) setSelectedScene(scene)
    },
    [scenes],
  )

  const onConnect = useCallback((connection: Connection) => {
    setPendingConnection(connection)
  }, [])

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node: Node) => {
      updateScene({
        sceneId: node.id,
        payload: { position_x: node.position.x, position_y: node.position.y },
      })
    },
    [updateScene],
  )

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      deleted.forEach((node) => deleteScene(node.id))
    },
    [deleteScene],
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      deleted.forEach((edge) => deleteChoice(edge.id))
    },
    [deleteChoice],
  )

  // Reattach a choice to a different scene: drop old edge, recreate with same text
  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (!newConnection.source || !newConnection.target) return
      const text = (oldEdge.data as unknown as ChoiceEdgeData)?.text ?? "Continue"
      deleteChoice(oldEdge.id)
      createChoice({
        from_scene_id: newConnection.source,
        to_scene_id: newConnection.target,
        text,
      })
    },
    [deleteChoice, createChoice],
  )

  function handleAddScene() {
    const isFirstScene = scenes.length === 0
    createScene({
      title: isFirstScene ? "Opening Scene" : "New Scene",
      content: "",
      scene_type: isFirstScene ? "start" : "middle",
      position_x: 100 + scenes.length * 60,
      position_y: 100 + scenes.length * 40,
    })
  }

  function handleChoiceConfirm(text: string) {
    if (!pendingConnection?.source || !pendingConnection?.target) return
    createChoice({
      from_scene_id: pendingConnection.source,
      to_scene_id: pendingConnection.target,
      text,
    })
    setPendingConnection(null)
  }

  function handleSetStart(sceneId: string) {
    updateScene({ sceneId, payload: { scene_type: "start" } })
    const currentStart = scenes.find((s) => s.scene_type === "start" && s.id !== sceneId)
    if (currentStart) {
      updateScene({ sceneId: currentStart.id, payload: { scene_type: "middle" } })
    }
    if (selectedScene?.id === sceneId) {
      setSelectedScene({ ...selectedScene, scene_type: "start" })
    }
  }

  return (
    <div className="relative h-full flex-1">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <ButtonUI size="sm" onClick={handleAddScene}>
          <Plus className="h-3.5 w-3.5" />
          Add Scene
        </ButtonUI>
        <span className="text-muted-foreground bg-card/80 hidden rounded-md border border-border px-2.5 py-1 text-[11px] backdrop-blur-sm md:block">
          Click a choice to edit its text or destination · select + ⌫ to delete
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} color="var(--rf-dots)" gap={20} size={1.5} />
        <Controls className="bg-card! border-border! rounded-lg!" />
        <MiniMap
          className="bg-card! border-border! rounded-lg!"
          nodeColor={(node) => {
            const type = (node.data as unknown as SceneNodeData).scene_type
            if (type === "start") return "#7b9669"
            if (type === "ending") return "#f43f5e"
            return "#6c8480"
          }}
        />
      </ReactFlow>

      <ScenePanel
        storyId={storyId}
        scene={selectedScene}
        onClose={() => setSelectedScene(null)}
        onSetStart={handleSetStart}
        onDelete={(sceneId) => {
          deleteScene(sceneId)
          setSelectedScene(null)
        }}
      />

      <ChoiceDialog
        open={!!pendingConnection}
        onConfirm={handleChoiceConfirm}
        onCancel={() => setPendingConnection(null)}
        editingChoice={editingChoice}
        onClose={() => setEditingChoice(null)}
        storyId={storyId}
        scenes={scenes}
      />
    </div>
  )
}
