/* ============================================================
   Pixel Office — Type Definitions
   ============================================================ */

export interface Position {
  x: number;
  y: number;
}

export enum TileType {
  VOID = 0,
  FLOOR = 1,
  WALL = 2,
  DESK = 3,
  DOOR = 4,
  CARPET = 5,
  PLANT = 6,
  CHAIR = 7,
}

export interface TileMap {
  width: number;
  height: number;
  tiles: TileType[][];
}

export type AgentStatus = 'idle' | 'busy' | 'error';

export interface AgentSprite {
  botName: string;
  position: Position;
  deskPosition: Position;
  status: AgentStatus;
  color: string;
  description?: string;
  specialties?: string[];
  platform?: string;
  currentTask?: { durationMs: number };
  stats?: { totalTasks: number; completedTasks: number; totalCostUsd: number };
  /** True if this is the lead bot (not a skill) */
  isLead?: boolean;
  /** Parent bot name (set for sub-skills) */
  parentBot?: string;
}

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  skills: string[];
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface OfficeState {
  tileMap: TileMap | null;
  rooms: Room[];
  skills: Map<string, AgentSprite>;
  playerPosition: Position;
  playerTargetPath: Position[];
  playerDirection: Direction;
  isMoving: boolean;
  selectedAgent: string | null;
  hoveredAgent: string | null;
  cameraOffset: Position;
}

export const TILE_SIZE = 32;

/** Walkable tile types for pathfinding */
export const WALKABLE_TILES = new Set([
  TileType.FLOOR,
  TileType.DOOR,
  TileType.CARPET,
]);
