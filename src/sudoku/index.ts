import { SudokuMath } from "./math";
import { StaticPool, isTimeoutError } from "node-worker-threads-pool";

import WORKERS from "physical-cpu-count";
const TIMEOUT = 5000;

export type Cell = { value: number | null };
export type CellArray = Cell[];
export type Row = CellArray;
export type Column = CellArray;
export type Region = CellArray;
export type Puzzle = CellArray;

export type GenerateArguments = {
  regionWidth: number;
  regionHeight: number;
  clues: number;
};

export type Sudoku = {
  regionWidth: number;
  regionHeight: number;
  cells: number;
  raw: Puzzle;
  rows: () => Row[];
  columns: () => Column[];
  regions: () => Region[];
};

const pool = new StaticPool<GenerateArguments, [any, Puzzle]>({
  size: WORKERS,
  task: "./src/sudoku/worker.js",
});

const _math = new SudokuMath(0, 0);
let activeWorkers = 0;

export async function generate(
  regionWidth: number,
  regionHeight: number,
  clues: number
): Promise<Sudoku> {
  if (activeWorkers >= WORKERS) {
    throw new Error("No workers available. Please try again in a moment.");
  }

  try {
    activeWorkers++;
    const [math, puzzle] = await pool.exec(
      {
        regionWidth,
        regionHeight,
        clues,
      },
      TIMEOUT
    );

    Object.assign(_math, math);

    return {
      regionWidth,
      regionHeight,
      cells: math.boardCells,
      raw: puzzle,
      rows: () => _math.regionsToRows(puzzle, true),
      columns: () => _math.regionsToCols(puzzle, true),
      regions: () => _math.chunkRegions(puzzle),
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new Error("Timed out. Try increasing the number of clues.");
    }
    throw err;
  } finally {
    activeWorkers--;
  }
}
