// Ramachandran-map renderer: a real per-residue phi/psi scatter over the
// Ramachandran ABEGO color map. The grid is the backend-computed RGB landscape
// (ABEGO-colored basins); the points are the pose's residues.

export interface RamaPoint {
  entity: number;
  index: number;
  phi: number;
  psi: number;
  aa: number;
  name: string;
  // 1-based pose residue index, the handle the ActionSetPhiPsi stream edits.
  // Absent on older backends that don't emit it; the drag no-ops in that case.
  pose_index: number;
}

/** Square RGB color grid. `rgb` is a flat 0-255 byte triplet array, length
 *  `size*size*3`; cell (ii=phi, jj=psi) starts at `(ii*size + jj)*3`. ii maps to
 *  phi = ii*5 - 180, jj maps to psi = jj*5 - 180, with ii,jj in 0..size-1. `aa`
 *  is the amino-acid index the grid was computed for (0 = the average grid). */
export interface RamaGrid {
  size: number;
  aa: number;
  rgb: number[];
}

export interface RamaRenderOptions {
  panelSize: number;
  grid: RamaGrid | null;
  points: RamaPoint[];
  selected: Set<string>;
  hover: RamaPoint | null;
}

/** Membership key matching the selection set built in the panel. */
export const pointKey = (p: { entity: number; index: number }): string =>
  `${p.entity}:${p.index}`;

/** Phi/psi (degrees) -> canvas pixel. Y is flipped so psi increases upward. */
export const phiPsiToPixel = (
  phi: number,
  psi: number,
  panelSize: number,
): [number, number] => [
  ((phi + 180) / 360) * panelSize,
  panelSize - ((psi + 180) / 360) * panelSize,
];

// Render the RGB grid at 1:1 into an offscreen canvas, then let the GPU upscale
// it with smoothing for a continuous gradient. Cell (ii=phi, jj=psi) draws to
// offscreen pixel (ii, size-1-jj): phi increases rightward with ii, psi
// increases upward, matching the dots from phiPsiToPixel.
function drawBackground(
  ctx: CanvasRenderingContext2D,
  panelSize: number,
  grid: RamaGrid,
) {
  const { size, rgb } = grid;

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  for (let ii = 0; ii < size; ++ii) {
    for (let jj = 0; jj < size; ++jj) {
      const base = (ii * size + jj) * 3;
      const r = rgb[base];
      const g = rgb[base + 1];
      const b = rgb[base + 2];
      offCtx.fillStyle = `rgb(${r},${g},${b})`;
      offCtx.fillRect(ii, size - 1 - jj, 1, 1);
    }
  }

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, panelSize, panelSize);
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  panelSize: number,
  points: RamaPoint[],
  selected: Set<string>,
  hover: RamaPoint | null,
) {
  for (const pt of points) {
    const [x, y] = phiPsiToPixel(pt.phi, pt.psi, panelSize);
    const radius = pt === hover ? 4 : 2.5;

    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (selected.has(pointKey(pt))) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawCrosshairs(ctx: CanvasRenderingContext2D, panelSize: number) {
  const half = panelSize / 2;
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, panelSize);
  ctx.moveTo(0, half);
  ctx.lineTo(panelSize, half);
  ctx.stroke();
}

export function drawRamaMap(
  canvas: HTMLCanvasElement,
  options: RamaRenderOptions,
) {
  const { panelSize, grid, points, selected, hover } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Backing store at device resolution, CSS box pinned to panelSize: this is
  // the fix for the grainy look (a 1:1 canvas blits blurry on HiDPI displays).
  const scale = window.devicePixelRatio || 1;
  canvas.width = panelSize * scale;
  canvas.height = panelSize * scale;
  canvas.style.width = `${panelSize}px`;
  canvas.style.height = `${panelSize}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.clearRect(0, 0, panelSize, panelSize);
  if (grid) drawBackground(ctx, panelSize, grid);
  drawPoints(ctx, panelSize, points, selected, hover);
  drawCrosshairs(ctx, panelSize);
}
