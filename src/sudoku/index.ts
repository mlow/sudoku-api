import { StaticPool, isTimeoutError } from "node-worker-threads-pool";

import WORKERS from "physical-cpu-count";
import { prettyPrint } from "./util";
const TIMEOUT = 20000;

export type Cell = number;

export type GenerateArguments = {
  regionWidth: number;
  regionHeight: number;
  clues: number;
};

export type Sudoku = {
  regionWidth: number;
  regionHeight: number;
  size: number;
  cells: Cell[];
};

const pool = new StaticPool<GenerateArguments, Cell[]>({
  size: WORKERS,
  task: "./src/sudoku/worker.js",
});

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
    const puzzle = await pool.exec(
      {
        regionWidth,
        regionHeight,
        clues,
      },
      TIMEOUT
    );

    prettyPrint(regionWidth, regionHeight, puzzle);

    return {
      regionWidth,
      regionHeight,
      size: (regionWidth * regionHeight) ** 2,
      cells: puzzle,
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
