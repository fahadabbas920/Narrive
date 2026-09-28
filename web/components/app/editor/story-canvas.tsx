"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeMouseHandler,
  type OnBeforeDelete,
  type OnConnectEnd,
  type OnEdgesDelete,
  type OnNodeDrag,
  type OnNodesDelete,
  type OnReconnect,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { AlertTriangle, CheckCircle2, LayoutGrid, Loader2, Plus, Sparkles } from "lucide-react"
import {
  useCreateChoice,
  useCreateScene,
  useDeleteChoice,
  useDeleteScene,
  useSaveLayout,
  useUpdateScene,
} from "@/hooks/use-story-editor"
import type { Choice, Scene } from "@/lib/api/stories"
import { analyzeGraph, tidyLayout, wordCount } from "@/lib/story-graph"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { SceneNode, type SceneNodeData } from "./scene-node"
import { ChoiceEdge, type ChoiceEdgeData } from "./choice-edge"
import { ScenePanel } from "./scene-panel"
import { ChoiceDialog, type ChoiceDraft } from "./choice-dialog"

const nodeTypes = { scene: SceneNode }
const edgeTypes = { choice: ChoiceEdge }
const NODE_W = 224
const NODE_H = 150

interface StoryCanvasProps {
  storyId: string
  scenes: Scene[]
  choices: Choice[]
}

function scenesToNodes(scenes: Scene[], choices: Choice[], selectedId: string | null): Node[] {
  const graph = analyzeGraph(scenes, choices)
  return scenes.map((scene) => ({
    id: scene.id,
    type: "scene",
    position: { x: scene.position_x, y: scene.position_y },
    selected: scene.id === selectedId,
    data: {
      title: scene.title,
      scene_type: scene.scene_type,
      content: scene.content,
      choiceCount: choices.filter((c) => c.from_scene_id === scene.id).length,
      words: wordCount(scene.content),
      issue: graph.issueFor(scene.id),
    } satisfies SceneNodeData,
  }))
}

function choicesToEdges(
  choices: Choice[],
  onEdit: (choice: Choice) => void,
  onDelete: (id: string) => void,
): Edge[] {
  // Group choices between the same pair of scenes (either direction) so parallel edges bow apart.
  const groups = new Map<string, string[]>()
  for (const c of choices) {
    const key = [c.from_scene_id, c.to_scene_id].sort().join("|")
    groups.set(key, [...(groups.get(key) ?? []), c.id])
  }
  return choices.map((choice) => {
    const group = groups.get([choice.from_scene_id, choice.to_scene_id].sort().join("|")) ?? [
      choice.id,
    ]
    const idx = group.indexOf(choice.id)
    return {
      id: choice.id,
      source: choice.from_scene_id,
      target: choice.to_scene_id,
      type: "choice",
      data: {
        text: choice.text,
        onEdit: () => onEdit(choice),
        onDelete: () => onDelete(choice.id),
        curveOffset: group.length > 1 ? (idx - (group.length - 1) / 2) * 70 : 0,
      } satisfies ChoiceEdgeData,
    }
  })
}

export function StoryCanvas(props: StoryCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

function Canvas({ storyId, scenes, choices }: StoryCanvasProps) {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [choiceDraft, setChoiceDraft] = useState<ChoiceDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{
    scenes: Scene[]
    resolve: (ok: boolean) => void
  } | null>(null)

  const { mutateAsync: createSceneAsync, isPending: creatingScene } = useCreateScene(storyId)
  const { mutate: updateScene } = useUpdateScene(storyId)
  const { mutate: deleteScene } = useDeleteScene(storyId)
  const { mutate: createChoice } = useCreateChoice(storyId)
  const { mutate: deleteChoice } = useDeleteChoice(storyId)
  const { mutate: saveLayout, isPending: tidying } = useSaveLayout(storyId)

  // Scenes being deleted — the backend drops their choices itself, so skip those edge deletes.
  const deletingIds = useRef<Set<string>>(new Set())

  const selectedScene = scenes.find((s) => s.id === selectedId) ?? null
  const graph = useMemo(() => analyzeGraph(scenes, choices), [scenes, choices])
  const issueCount =
    (graph.startId ? 0 : 1) + scenes.filter((s) => graph.issueFor(s.id) !== null).length

  const editChoice = useCallback((choice: Choice) => setChoiceDraft({ kind: "edit", choice }), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(scenesToNodes(scenes, choices, selectedId))
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    choicesToEdges(choices, editChoice, deleteChoice),
  )

  useEffect(() => {
    setNodes(scenesToNodes(scenes, choices, selectedId))
    setEdges(choicesToEdges(choices, editChoice, deleteChoice))
    // Only re-derive when server data changes; selection is handled by React Flow meanwhile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, choices])

  /** A random spot inside the visible canvas that doesn't overlap an existing scene. */
  function freeSpotInView() {
    const rect = wrapper.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    // Screen-space margins keep new scenes clear of the toolbar, minimap and edges.
    const topLeft = screenToFlowPosition({ x: rect.left + 48, y: rect.top + 88 })
    const bottomRight = screenToFlowPosition({ x: rect.right - 48, y: rect.bottom - 72 })
    const spanX = bottomRight.x - topLeft.x - NODE_W
    const spanY = bottomRight.y - topLeft.y - NODE_H

    const center = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    if (spanX <= 0 || spanY <= 0) {
      return {
        x: center.x - NODE_W / 2 + (Math.random() - 0.5) * 80,
        y: center.y - NODE_H / 2 + (Math.random() - 0.5) * 80,
      }
    }

    const GAP = 24
    const boxes = getNodes().map((n) => ({
      x: n.position.x,
      y: n.position.y,
      w: n.measured?.width ?? NODE_W,
      h: n.measured?.height ?? NODE_H,
    }))
    const clearance = (x: number, y: number) =>
      Math.min(
        Infinity,
        ...boxes.map((b) => {
          const dx = Math.max(b.x - (x + NODE_W), x - (b.x + b.w), 0)
          const dy = Math.max(b.y - (y + NODE_H), y - (b.y + b.h), 0)
          return Math.hypot(dx, dy)
        }),
      )

    // Try random spots; take the first that's clear, else the roomiest one we saw.
    let best = { x: topLeft.x + Math.random() * spanX, y: topLeft.y + Math.random() * spanY }
    let bestClear = clearance(best.x, best.y)
    for (let i = 0; i < 60 && bestClear < GAP; i++) {
      const candidate = {
        x: topLeft.x + Math.random() * spanX,
        y: topLeft.y + Math.random() * spanY,
      }
      const clear = clearance(candidate.x, candidate.y)
      if (clear > bestClear) {
        best = candidate
        bestClear = clear
      }
    }
    return best
  }

  async function addScene(position = freeSpotInView()) {
    const first = scenes.length === 0
    const scene = await createSceneAsync({
      title: first ? "Opening scene" : "New scene",
      content: "",
      scene_type: first ? "start" : "middle",
      position_x: Math.round(position.x),
      position_y: Math.round(position.y),
    })
    selectScene(scene.id)
    return scene
  }

  const selectScene = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      setNodes((ns) =>
        ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
      )
    },
    [setNodes],
  )

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => setSelectedId(node.id), [])

  const isValidConnection: IsValidConnection = useCallback(
    (c) => !!c.source && !!c.target && c.source !== c.target,
    [],
  )

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) setChoiceDraft({ kind: "create", fromId: c.source, toId: c.target })
  }, [])

  // Dropping a new connection on empty canvas creates a scene there, already linked.
  const onConnectEnd: OnConnectEnd = useCallback(
    async (event, state) => {
      if (state.isValid || !state.fromNode || state.fromHandle?.type !== "source") return
      const target = event.target as HTMLElement | null
      if (!target?.classList.contains("react-flow__pane")) return
      const point = "changedTouches" in event ? event.changedTouches[0] : event
      const pos = screenToFlowPosition({ x: point.clientX, y: point.clientY })
      const scene = await createSceneAsync({
        title: "New scene",
        content: "",
        scene_type: "middle",
        position_x: Math.round(pos.x - NODE_W / 2),
        position_y: Math.round(pos.y),
      })
      setChoiceDraft({ kind: "create", fromId: state.fromNode.id, toId: scene.id })
    },
    [createSceneAsync, screenToFlowPosition],
  )

  // Save every node that moved — including the rest of a multi-selection.
  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, _node, dragged) => {
      for (const n of dragged) {
        const scene = scenes.find((s) => s.id === n.id)
        if (!scene || (scene.position_x === n.position.x && scene.position_y === n.position.y))
          continue
        updateScene({
          sceneId: n.id,
          payload: { position_x: n.position.x, position_y: n.position.y },
        })
      }
    },
    [scenes, updateScene],
  )

  // Keyboard deletes of scenes ask first; choices can go straight away.
  const onBeforeDelete: OnBeforeDelete = useCallback(
    ({ nodes: toDelete }) => {
      if (toDelete.length === 0) return Promise.resolve(true)
      const doomed = scenes.filter((s) => toDelete.some((n) => n.id === s.id))
      return new Promise<boolean>((resolve) => setPendingDelete({ scenes: doomed, resolve }))
    },
    [scenes],
  )

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      deleted.forEach((n) => deleteScene(n.id))
      if (deleted.some((n) => n.id === selectedId)) setSelectedId(null)
    },
    [deleteScene, selectedId],
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) =>
      deleted
        .filter((e) => !deletingIds.current.has(e.source) && !deletingIds.current.has(e.target))
        .forEach((e) => deleteChoice(e.id)),
    [deleteChoice],
  )

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, c) => {
      if (!c.source || !c.target || c.source === c.target) return
      const text = (oldEdge.data as unknown as ChoiceEdgeData)?.text ?? "Continue"
      deleteChoice(oldEdge.id)
      createChoice({ from_scene_id: c.source, to_scene_id: c.target, text })
    },
    [deleteChoice, createChoice],
  )

  function setStart(sceneId: string) {
    const current = scenes.find((s) => s.scene_type === "start" && s.id !== sceneId)
    if (current) updateScene({ sceneId: current.id, payload: { scene_type: "middle" } })
    updateScene({ sceneId, payload: { scene_type: "start" } })
  }

  function tidyUp() {
    const layout = tidyLayout(scenes, choices)
    const moved = scenes
      .map((s) => ({ id: s.id, ...(layout.get(s.id) as { x: number; y: number }) }))
      .filter((p) => {
        const s = scenes.find((x) => x.id === p.id)!
        return s.position_x !== p.x || s.position_y !== p.y
      })
    setNodes((ns) => ns.map((n) => ({ ...n, position: layout.get(n.id) ?? n.position })))
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
    if (moved.length) saveLayout(moved)
  }

  function confirmDelete(ok: boolean) {
    if (ok) deletingIds.current = new Set(pendingDelete?.scenes.map((s) => s.id))
    pendingDelete?.resolve(ok)
    setPendingDelete(null)
  }

  const deletingStart = pendingDelete?.scenes.some((s) => s.scene_type === "start")

  return (
    <div ref={wrapper} className="relative h-full flex-1">
      {/* Toolbar */}
      <div className="bg-card/90 border-border absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => addScene()}
          disabled={creatingScene}
          className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {creatingScene ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add scene
        </button>
        <button
          type="button"
          onClick={tidyUp}
          disabled={scenes.length < 2 || tidying}
          title="Arrange scenes top-down from the start"
          className="text-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tidying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
          Tidy up
        </button>
        <div className="bg-border mx-1 h-5 w-px" />
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold",
            issueCount === 0 ? "text-mint-ink" : "text-butter-ink",
          )}
          title={
            issueCount === 0 ? "Every path works" : "Scenes with warnings are badged on the canvas"
          }
        >
          {issueCount === 0 ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {scenes.length === 0
            ? "Empty story"
            : issueCount === 0
              ? "All paths work"
              : `${issueCount} to fix`}
        </span>
      </div>

      {scenes.length > 0 && (
        <p className="text-muted-foreground bg-card/80 border-border pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border px-3.5 py-1.5 text-xs backdrop-blur-sm lg:block">
          Drag from a scene&apos;s bottom dot to link it · drop on empty space to create a new scene
        </p>
      )}

      {scenes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-card/90 border-border pointer-events-auto flex max-w-sm flex-col items-center rounded-4xl border p-8 text-center shadow-xl backdrop-blur-md">
            <div className="bg-mint mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Sparkles className="text-mint-ink h-7 w-7" />
            </div>
            <p className="text-foreground text-lg font-extrabold">
              Every story starts with one scene
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Write your opening, then drag out choices to branch the story.
            </p>
            <button
              type="button"
              onClick={() => addScene({ x: 0, y: 0 })}
              disabled={creatingScene}
              className="bg-primary text-primary-foreground mt-5 flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Write the opening scene
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onPaneClick={() => selectScene(null)}
        onNodeDragStop={onNodeDragStop}
        onBeforeDelete={onBeforeDelete}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.2}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: false }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} color="var(--rf-dots)" gap={22} size={1.6} />
        <Controls
          showInteractive={false}
          className="bg-card! border-border! overflow-hidden rounded-2xl! shadow-md!"
        />
        <MiniMap
          pannable
          zoomable
          className="bg-card! border-border! overflow-hidden rounded-2xl! shadow-md!"
          maskColor="color-mix(in oklch, var(--background) 70%, transparent)"
          nodeBorderRadius={12}
          nodeColor={(node) => {
            const t = (node.data as unknown as SceneNodeData).scene_type
            return t === "start"
              ? "var(--mint-ink)"
              : t === "ending"
                ? "var(--blush-ink)"
                : "var(--lavender-ink)"
          }}
        />
      </ReactFlow>

      <ScenePanel
        storyId={storyId}
        scene={selectedScene}
        scenes={scenes}
        choices={choices}
        onClose={() => setSelectedId(null)}
        onSetStart={setStart}
        onChangeType={(id, type) => updateScene({ sceneId: id, payload: { scene_type: type } })}
        onRequestDelete={(scene) => {
          new Promise<boolean>((resolve) => setPendingDelete({ scenes: [scene], resolve })).then(
            (ok) => {
              if (ok) {
                deleteScene(scene.id)
                setSelectedId(null)
              }
            },
          )
        }}
        onAddChoice={(fromId) => setChoiceDraft({ kind: "create", fromId })}
        onEditChoice={editChoice}
        onSelectScene={selectScene}
      />

      <ChoiceDialog
        draft={choiceDraft}
        onClose={() => setChoiceDraft(null)}
        storyId={storyId}
        scenes={scenes}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete && pendingDelete.scenes.length > 1
            ? `Delete ${pendingDelete.scenes.length} scenes?`
            : `Delete “${pendingDelete?.scenes[0]?.title || "this scene"}”?`
        }
        description={
          <>
            Its choices — in and out — are removed too. This can&apos;t be undone.
            {deletingStart && (
              <span className="text-foreground mt-2 block font-semibold">
                This is your start scene. Readers can&apos;t begin the story until you choose a new
                one.
              </span>
            )}
          </>
        }
        confirmLabel={
          pendingDelete && pendingDelete.scenes.length > 1 ? "Delete scenes" : "Delete scene"
        }
        onConfirm={() => confirmDelete(true)}
        onCancel={() => confirmDelete(false)}
      />
    </div>
  )
}
