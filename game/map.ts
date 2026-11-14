// Hastane haritası. Her karakter 2x2 birimlik bir hücredir.
// # duvar | . zemin | P oyuncu | E yaratık | F sigorta | G jeneratör
// X çıkış kapısı | b sedye/yatak (engel) | c dolap (engel)
export const CELL = 2;
export const WALL_H = 3.2;

const RAW: string[] = [
  '###########################',
  '#....#....#.F..#....#...F.#',
  '#.b..#..c.#.b..#..c.#..b..#',
  '#.b..#......b..#....#.....#',
  '#....#....#....#....#.....#',
  '###.####.####.####.####.###',
  '#........b................X',
  '#................b........#',
  '##.####.#####.#####.####.##',
  '#P...#....#....#....#.....#',
  '#..b.#.c..#..b.#c...#...c.#',
  '#..b.#....#....#..........#',
  '#....#....#....#..F.#..G..#',
  '###########################',
];

export const ROWS = RAW.length;
export const COLS = RAW[0].length;

export interface Vec2 {
  x: number;
  z: number;
}
export interface Cell {
  cx: number;
  cz: number;
}

export function cellCenter(cx: number, cz: number): Vec2 {
  return { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL };
}

export function worldToCell(x: number, z: number): Cell {
  return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
}

const grid: string[][] = [];
const fuseSpawns: Vec2[] = [];
const wallList: Cell[] = [];
const bedList: Cell[] = [];
const cabinetList: Cell[] = [];
const floorList: Cell[] = [];
let playerSpawn: Vec2 = { x: 3, z: 3 };
let enemySpawn: Vec2 = { x: 40, z: 14 };
let generatorPos: Vec2 = { x: 40, z: 24 };
let exitPos: Vec2 = { x: 53, z: 13 };

for (let cz = 0; cz < ROWS; cz++) {
  const row: string[] = [];
  for (let cx = 0; cx < COLS; cx++) {
    const ch = RAW[cz].charAt(cx) || '#';
    const c = cellCenter(cx, cz);
    let out = ch;
    switch (ch) {
      case 'P':
        playerSpawn = c;
        out = '.';
        break;
      case 'E':
        enemySpawn = c;
        out = '.';
        break;
      case 'F':
        fuseSpawns.push(c);
        out = '.';
        break;
      case 'G':
        generatorPos = c;
        break;
      case 'X':
        exitPos = c;
        break;
      default:
        break;
    }
    row.push(out);
  }
  grid.push(row);
}

// Yaratık oyuncudan uzakta, koridorun doğu tarafında başlar.
enemySpawn = cellCenter(22, 7);

function solidChar(ch: string): boolean {
  return ch === '#' || ch === 'b' || ch === 'c' || ch === 'X' || ch === 'G';
}

export function isSolidCell(cx: number, cz: number): boolean {
  if (cx < 0 || cz < 0 || cx >= COLS || cz >= ROWS) return true;
  return solidChar(grid[cz][cx]);
}

for (let cz = 0; cz < ROWS; cz++) {
  for (let cx = 0; cx < COLS; cx++) {
    const ch = grid[cz][cx];
    if (ch === 'b') bedList.push({ cx, cz });
    else if (ch === 'c') cabinetList.push({ cx, cz });
    else if (ch === '.') floorList.push({ cx, cz });
    else if (ch === '#') {
      // Yalnızca açık bir hücreye komşu olan duvarları çiz (performans).
      let visible = false;
      for (let dz = -1; dz <= 1 && !visible; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= COLS || nz >= ROWS) continue;
          const n = grid[nz][nx];
          if (n !== '#') {
            visible = true;
            break;
          }
        }
      }
      if (visible) wallList.push({ cx, cz });
    }
  }
}

export const spawns = {
  player: playerSpawn,
  enemy: enemySpawn,
  fuses: fuseSpawns,
  generator: generatorPos,
  exit: exitPos,
};
export const wallCells: Cell[] = wallList;
export const beds: Cell[] = bedList;
export const cabinets: Cell[] = cabinetList;
export const floorCells: Cell[] = floorList;

/** Kare şeklindeki oyuncu/yaratık kutusu bir engelle çakışıyor mu? */
export function collides(x: number, z: number, r: number): boolean {
  const x0 = Math.floor((x - r) / CELL);
  const x1 = Math.floor((x + r) / CELL);
  const z0 = Math.floor((z - r) / CELL);
  const z1 = Math.floor((z + r) / CELL);
  for (let cz = z0; cz <= z1; cz++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (isSolidCell(cx, cz)) return true;
    }
  }
  return false;
}

/** Eksen eksen çarpışma — duvarlara sürtünerek kayar, geçemez. */
export function moveWithCollision(
  x: number,
  z: number,
  dx: number,
  dz: number,
  r: number,
  out: Vec2,
): void {
  let nx = x + dx;
  if (collides(nx, z, r)) nx = x;
  let nz = z + dz;
  if (collides(nx, nz, r)) nz = z;
  out.x = nx;
  out.z = nz;
}

/** İki nokta arasında görüş hattı var mı? */
export function hasLOS(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidCell(Math.floor((ax + dx * t) / CELL), Math.floor((az + dz * t) / CELL))) {
      return false;
    }
  }
  return true;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** BFS yol bulma (hücre merkezleri). Başlangıç hücresi dahil değildir. */
export function findPath(sx: number, sz: number, gx: number, gz: number): Cell[] {
  const s = worldToCell(sx, sz);
  const g = worldToCell(gx, gz);
  if (isSolidCell(g.cx, g.cz) || isSolidCell(s.cx, s.cz)) return [];
  const W = COLS;
  const sIdx = s.cz * W + s.cx;
  const gIdx = g.cz * W + g.cx;
  if (sIdx === gIdx) return [];
  const prev = new Int32Array(ROWS * COLS).fill(-2);
  prev[sIdx] = -1;
  const queue: number[] = [sIdx];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === gIdx) break;
    const cx = cur % W;
    const cz = (cur - cx) / W;
    for (const [ddx, ddz] of DIRS) {
      const nx = cx + ddx;
      const nz = cz + ddz;
      if (isSolidCell(nx, nz)) continue;
      const n = nz * W + nx;
      if (prev[n] === -2) {
        prev[n] = cur;
        queue.push(n);
      }
    }
  }
  if (prev[gIdx] === -2) return [];
  const path: Cell[] = [];
  let c = gIdx;
  while (c !== sIdx) {
    path.push({ cx: c % W, cz: Math.floor(c / W) });
    c = prev[c];
  }
  path.reverse();
  return path;
}

export function randomFloorCell(): Cell {
  return floorList[Math.floor(Math.random() * floorList.length)];
}
