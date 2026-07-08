import { createEffect, createSignal, onCleanup } from 'solid-js';
import type { EntitySelection, PluginBridge } from '@foldit/plugin-bridge';
import {
  drawRamaMap,
  phiPsiToPixel,
  pointKey,
  type RamaGrid,
  type RamaPoint,
} from './ramaMapRenderer';

const PLOT = 320;
// Pose re-fetch coalescing window; the score stream can fire many deltas per
// second during a wiggle, but we only need the latest phi/psi.
const REFETCH_DEBOUNCE_MS = 100;

// Backend queries return the K1 envelope `{ encoding: 'base64', content }`;
// payloads are ASCII JSON, so atob + JSON.parse decodes them.
interface QueryEnvelope {
  encoding: string;
  content: string;
}

function decodeQuery<T>(result: unknown): T | null {
  const env = result as QueryEnvelope | null | undefined;
  if (!env || typeof env.content !== 'string') return null;
  try {
    return JSON.parse(atob(env.content)) as T;
  } catch {
    return null;
  }
}

function selectionKeys(entries: EntitySelection[] | undefined): Set<string> {
  const keys = new Set<string>();
  for (const entry of entries ?? []) {
    for (const res of entry.residues) {
      keys.add(pointKey({ entity: entry.entity_id, index: res }));
    }
  }
  return keys;
}

export function RamaMapPanel(props: { panelId: string; bridge: PluginBridge }) {
  const bridge = props.bridge;

  const [grid, setGrid] = createSignal<RamaGrid | null>(null);
  const [points, setPoints] = createSignal<RamaPoint[]>([]);
  const [hover, setHover] = createSignal<RamaPoint | null>(null);
  const [selected, setSelected] = createSignal<Set<string>>(
    selectionKeys(bridge.snapshot().selection?.entries),
  );

  // The Ramachandran maps are pose-independent (they are the Ramachandran
  // function, not the pose), so each grid is fetched once and cached forever.
  // Key 0 is the average grid; keys 1..20 are the per-amino-acid grids.
  const gridCache = new Map<number, RamaGrid>();
  const AVG_KEY = 0;

  // Fetch and cache the grid for `aa` (0 = average, omit the param), then run
  // `then` with the cached grid. A null/failed response leaves the cache and
  // the displayed grid untouched (we keep showing the last good map).
  const fetchGrid = (aa: number, then: (g: RamaGrid) => void) => {
    const cached = gridCache.get(aa);
    if (cached) {
      then(cached);
      return;
    }
    const params = aa === AVG_KEY ? {} : { aa_index: { Int: aa } };
    bridge
      .request('plugin_query', { query_id: 'rama_colors', params })
      .then((r) => {
        const g = decodeQuery<RamaGrid>(r);
        if (g) {
          gridCache.set(aa, g);
          then(g);
        }
      })
      .catch(() => {});
  };

  fetchGrid(AVG_KEY, setGrid);

  const fetchPoints = () => {
    bridge
      .request('plugin_query', { query_id: 'get_phi_psi', params: {} })
      .then((r) => {
        const data = decodeQuery<{ residues: RamaPoint[] }>(r);
        setPoints(data?.residues ?? []);
      })
      .catch(() => setPoints([]));
  };
  fetchPoints();

  // Re-fetch dihedrals when the pose changes. `score` tracks live geometry
  // edits (every wiggle/edit rescores); `history` covers checkpoint navigation
  // (undo/redo loads a different pose); `scene` covers focus changes, which
  // re-scope the dots to the focused entity. All are debounced into one fetch.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubPose = bridge.subscribe(
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchPoints, REFETCH_DEBOUNCE_MS);
    },
    ['score', 'history', 'scene'],
  );

  // Pick the displayed grid from the current selection: exactly one selected
  // residue shows that residue's per-amino-acid map, otherwise the average.
  const applySelectionGrid = (keys: Set<string>) => {
    if (keys.size === 1) {
      const [key] = keys;
      const dot = points().find((p) => pointKey(p) === key);
      if (dot && dot.aa >= 1 && dot.aa <= 20) {
        fetchGrid(dot.aa, setGrid);
        return;
      }
    }
    fetchGrid(AVG_KEY, setGrid);
  };

  const unsubSelection = bridge.subscribe(
    (delta) => {
      if (delta.selection) {
        const keys = selectionKeys(delta.selection.entries);
        setSelected(keys);
        applySelectionGrid(keys);
      }
    },
    ['selection'],
  );

  onCleanup(() => {
    if (timer) clearTimeout(timer);
    unsubPose();
    unsubSelection();
  });

  let canvas: HTMLCanvasElement | undefined;
  createEffect(() => {
    const opts = {
      panelSize: PLOT,
      grid: grid(),
      points: points(),
      selected: selected(),
      hover: hover(),
    };
    if (canvas) drawRamaMap(canvas, opts);
  });

  // Cursor position in the PLOT (CSS-pixel) coordinate space the dot geometry
  // lives in, accounting for any CSS scaling of the canvas box.
  const cursorPlot = (e: MouseEvent): [number, number] | null => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PLOT;
    const y = ((e.clientY - rect.top) / rect.height) * PLOT;
    return [x, y];
  };

  // Nearest dot to the cursor within the hit radius, or null. Shared by the
  // hover feedback and the drag handlers.
  const nearestDot = (e: MouseEvent): RamaPoint | null => {
    const cursor = cursorPlot(e);
    if (!cursor) return null;
    const [x, y] = cursor;
    let best: RamaPoint | null = null;
    let bestD = 8 * 8;
    for (const pt of points()) {
      const [px, py] = phiPsiToPixel(pt.phi, pt.psi, PLOT);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d <= bestD) {
        bestD = d;
        best = pt;
      }
    }
    return best;
  };

  // Drag-to-set-phi/psi state. `armedDot` is set on a mousedown that hit a dot
  // but hasn't moved yet (a pure click must start no stream); the first move
  // promotes it to `dragging` and opens the ActionSetPhiPsi stream. `dragRid`
  // is the live stream id, null until startStream resolves. `committing` latches
  // while cancelStream is in flight so a second drag can't open a parallel
  // stream (single stream per session). `pendingAngles` coalesces moves that
  // arrive before the stream id resolves (last-value-wins).
  let armedDot: RamaPoint | null = null;
  let dragging = false;
  let dragRid: number | null = null;
  let committing = false;
  let pendingAngles: [number, number] | null = null;
  let lastUpdateAt = 0;
  const THROTTLE_MS = 16;

  const clampAngle = (v: number) => Math.max(-180, Math.min(180, v));

  // Optimistic display-only move: the dot follows the cursor immediately. The
  // backend is authoritative and the next get_phi_psi re-fetch reconciles it.
  const moveDotLocally = (dot: RamaPoint, phi: number, psi: number) => {
    const key = pointKey(dot);
    setPoints((prev) =>
      prev.map((p) => (pointKey(p) === key ? { ...p, phi, psi } : p)),
    );
  };

  const sendAngles = (rid: number, phi: number, psi: number) => {
    lastUpdateAt = Date.now();
    // z is omega; the drag is 2-DOF so it always stays 0.
    bridge.updateStream(rid, { angles: { Vec3: [phi, psi, 0] } });
  };

  const resetDrag = () => {
    armedDot = null;
    dragging = false;
    dragRid = null;
    committing = false;
    pendingAngles = null;
  };

  const commitStream = (rid: number) => {
    committing = true;
    return bridge
      .cancelStream(rid)
      .catch(() => {})
      .finally(resetDrag);
  };

  // Mousedown on a dot selects that residue (keeps heatmap focus) and arms the
  // drag without opening a stream yet. Empty space leaves selection untouched.
  const onDown = (e: MouseEvent) => {
    if (committing) return;
    const dot = nearestDot(e);
    if (!dot) return;
    bridge.setSelection([{ entity_id: dot.entity, residues: [dot.index] }]);
    armedDot = dot;
    dragging = false;
    dragRid = null;
    pendingAngles = null;
  };

  const onMove = (e: MouseEvent) => {
    setHover(nearestDot(e));
    if (!armedDot || committing) return;

    const cursor = cursorPlot(e);
    if (!cursor) return;
    const phi = clampAngle((cursor[0] / PLOT) * 360 - 180);
    const psi = clampAngle(((PLOT - cursor[1]) / PLOT) * 360 - 180);

    if (!dragging) {
      // armed -> dragging on first move. Backends that don't emit pose_index
      // give us no residue handle, so the drag silently no-ops.
      if (armedDot.pose_index == null) return;
      dragging = true;
      pendingAngles = [phi, psi];
      const dot = armedDot;
      moveDotLocally(dot, phi, psi);
      bridge
        .startStream({
          op_id: 'ActionSetPhiPsi',
          focused_entity_id: dot.entity,
          params: { residue: { Int: dot.pose_index } },
        })
        .then((rid) => {
          if (!dragging) {
            // mouseup raced ahead of the stream opening; commit immediately.
            void commitStream(rid);
            return;
          }
          dragRid = rid;
          if (pendingAngles) sendAngles(rid, pendingAngles[0], pendingAngles[1]);
        })
        .catch(() => resetDrag());
      return;
    }

    moveDotLocally(armedDot, phi, psi);

    if (dragRid == null) {
      // stream still opening; keep only the latest angle to flush on resolve.
      pendingAngles = [phi, psi];
      return;
    }
    if (Date.now() - lastUpdateAt >= THROTTLE_MS) sendAngles(dragRid, phi, psi);
  };

  // Release ends the gesture. A drag commits via cancelStream; a pure click
  // (armed but never moved) just drops the armed state (selection already
  // happened on mousedown, no stream was opened).
  const onUp = () => {
    if (!armedDot) return;
    if (!dragging) {
      resetDrag();
      return;
    }
    committing = true;
    dragging = false;
    if (dragRid != null) void commitStream(dragRid);
    // else: startStream is still in flight; its resolve commits the rid.
  };

  const onLeave = () => {
    setHover(null);
    onUp();
  };

  onCleanup(() => {
    if (dragRid != null) void bridge.cancelStream(dragRid).catch(() => {});
  });

  return (
    <div class="rama-root">
      <canvas
        class="rama-canvas"
        ref={canvas}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onLeave}
      />
      <div class="rama-footer">
        <span>{points().length} residues</span>
      </div>
    </div>
  );
}
