"""Story-graph checks and layout, ported from the editor (web/lib/story-graph.ts and
web/lib/validate-story.ts) so admin health reports and imports match what writers see."""

import math
from collections import deque
from collections.abc import Hashable, Iterable
from dataclasses import dataclass, field
from typing import Literal

NODE_W, NODE_H, GAP_X, GAP_Y = 224, 150, 64, 110


@dataclass(frozen=True)
class Node:
    id: Hashable
    type: str  # "start" | "middle" | "ending"
    x: float = 0.0
    y: float = 0.0


@dataclass
class Health:
    start_count: int
    ending_count: int
    unreachable: list[Hashable] = field(default_factory=list)
    dead_ends: list[Hashable] = field(default_factory=list)
    reachable_endings: int = 0

    @property
    def issues(self) -> list[tuple[Literal["error", "warning"], str]]:
        out: list[tuple[Literal["error", "warning"], str]] = []
        if self.start_count == 0:
            out.append(("error", "No start scene is set."))
        elif self.start_count > 1:
            out.append(("warning", f"{self.start_count} scenes are marked as the start."))
        if self.start_count:
            if self.unreachable:
                n = len(self.unreachable)
                out.append(("warning", f"{n} scene{'s' if n > 1 else ''} can't be reached."))
            if self.reachable_endings == 0:
                out.append(("warning", "No ending is reachable from the start."))
        if self.dead_ends:
            n = len(self.dead_ends)
            out.append(
                ("warning", f"{n} dead end{'s' if n > 1 else ''} (no choices, not an ending).")
            )
        return out

    @property
    def ok(self) -> bool:
        return not self.issues


def analyze(nodes: list[Node], edges: Iterable[tuple[Hashable, Hashable]]) -> Health:
    outgoing: dict[Hashable, list[Hashable]] = {}
    for src, dst in edges:
        outgoing.setdefault(src, []).append(dst)

    starts = [n for n in nodes if n.type == "start"]
    reachable: set[Hashable] = set()
    if starts:
        stack = [starts[0].id]
        while stack:
            node_id = stack.pop()
            if node_id in reachable:
                continue
            reachable.add(node_id)
            stack.extend(outgoing.get(node_id, []))

    endings = [n for n in nodes if n.type == "ending"]
    return Health(
        start_count=len(starts),
        ending_count=len(endings),
        unreachable=[n.id for n in nodes if starts and n.id not in reachable],
        dead_ends=[n.id for n in nodes if n.type != "ending" and not outgoing.get(n.id)],
        reachable_endings=sum(1 for n in endings if n.id in reachable),
    )


def tidy_layout(
    nodes: list[Node], edges: Iterable[tuple[Hashable, Hashable]]
) -> dict[Hashable, tuple[int, int]]:
    """Layered top-down layout: each scene on the row of its shortest path from the start,
    rows ordered by their parents' columns. Unreachable scenes go in rows underneath."""
    by_id = {n.id: n for n in nodes}
    children: dict[Hashable, list[Hashable]] = {}
    parents: dict[Hashable, list[Hashable]] = {}
    for src, dst in edges:
        if src in by_id and dst in by_id:
            children.setdefault(src, []).append(dst)
            parents.setdefault(dst, []).append(src)

    depth: dict[Hashable, int] = {}
    queue: deque[Hashable] = deque()
    for n in nodes:
        if n.type == "start":
            depth[n.id] = 0
            queue.append(n.id)
    while queue:
        node_id = queue.popleft()
        for child in children.get(node_id, []):
            if child not in depth:
                depth[child] = depth[node_id] + 1
                queue.append(child)

    max_depth = max(depth.values(), default=-1)
    leftovers = sorted((n for n in nodes if n.id not in depth), key=lambda n: (n.y, n.x))
    per_row = max(3, math.ceil(math.sqrt(len(leftovers)))) if leftovers else 1
    for i, n in enumerate(leftovers):
        depth[n.id] = max_depth + 1 + i // per_row
    max_depth = max(depth.values(), default=-1)

    rows: list[list[Hashable]] = [[] for _ in range(max_depth + 1)]
    for n in nodes:
        rows[depth[n.id]].append(n.id)

    column: dict[Hashable, float] = {}
    for r, row in enumerate(rows):

        def score(node_id: Hashable, r: int = r) -> float:
            ps = [p for p in parents.get(node_id, []) if depth.get(p, r) < r and p in column]
            return sum(column[p] for p in ps) / len(ps) if ps else math.inf

        row.sort(key=lambda node_id: (score(node_id), by_id[node_id].x))
        for i, node_id in enumerate(row):
            column[node_id] = i - (len(row) - 1) / 2

    return {
        n.id: (round(column[n.id] * (NODE_W + GAP_X)), round(depth[n.id] * (NODE_H + GAP_Y)))
        for n in nodes
    }
