import { spawn, Thread, Worker } from "threads";
import type { ModuleThread } from "threads";
import { SudokuMath } from "./math.js";
import { prettyPrint } from "./util.js";

import WORKERS from "physical-cpu-count";

const TIMEOUT = 20000;

export type Cell = number;

export type GenerateArguments = {
  regionWidth: number;
  regionHeight: number;
  clues: number;
};

export type SolveArguments = {
  regionWidth: number;
  regionHeight: number;
  cells: Cell[];
};

export type Sudoku = {
  regionWidth: number;
  regionHeight: number;
  size: number;
  cells: Cell[];
};

type SudokuWorker = {
  generate: (
    regionWidth: number,
    regionHeight: number,
    clues: number
  ) => Promise<number[]>;
  solve: (
    regionWidth: number,
    regionHeight: number,
    cells: number[]
  ) => Promise<[boolean, number[]]>;
};

const available: ModuleThread<SudokuWorker>[] = [];

function spawnWorker() {
  spawn<SudokuWorker>(new Worker("./worker")).then((worker) =>
    available.push(worker)
  );
}

function initialize() {
  console.log(`Starting ${WORKERS} worker threads`);
  for (let n = 0; n < WORKERS; n++) {
    spawnWorker();
  }
}
initialize();

function pickWorker() {
  const proxy = available.pop();
  if (!proxy) {
    throw new Error("No workers available right now. Please try again.");
  }
  return proxy;
}

/**
 * Awaits a promise with a timeout.
 *
 * @param promise the promise to await
 * @param ms the timeout in milliseconds
 * @param cb a callback to call when the timeout is reached. The promise is
 *           rejected with whatever gets returned here.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, cb: () => any) {
  let timeout: NodeJS.Timeout;
  return new Promise<T>((resolve, reject) => {
    timeout = setTimeout(() => {
      reject(cb());
    }, ms);
    promise.then(resolve).catch(reject);
  }).finally(() => clearTimeout(timeout!));
}

function workerTaskWithTimeout(
  task: (worker: ModuleThread) => Promise<any>,
  timeout: number
) {
  const worker = pickWorker();
  let timedOut = false;
  return withTimeout(task(worker), timeout, () => {
    timedOut = true;
    Thread.terminate(worker);
    spawnWorker();
    return new Error("Timed out.");
  }).finally(() => {
    if (!timedOut) {
      available.push(worker);
    }
  });
}

export async function generate({
  regionWidth,
  regionHeight,
  clues,
}: GenerateArguments): Promise<Sudoku> {
  const puzzle = await workerTaskWithTimeout(
    (worker) => worker.generate(regionWidth, regionHeight, clues),
    TIMEOUT
  );
  prettyPrint(regionWidth, regionHeight, puzzle);
  return {
    regionWidth,
    regionHeight,
    size: (regionWidth * regionHeight) ** 2,
    cells: puzzle,
  };
}

export function generateSync({
  regionWidth,
  regionHeight,
  clues,
}: GenerateArguments): Sudoku {
  const math = SudokuMath.get(regionWidth, regionHeight);
  const cells = math.generate(clues, 1, TIMEOUT);
  prettyPrint(regionWidth, regionHeight, cells);
  return {
    regionWidth,
    regionHeight,
    size: (regionWidth * regionHeight) ** 2,
    cells,
  };
}

export async function solve({
  regionWidth,
  regionHeight,
  cells,
}: SolveArguments): Promise<Sudoku> {
  const size = (regionWidth * regionHeight) ** 2;
  if (size !== cells.length) {
    throw new Error(
      "The given region dimensions do not align with the number of cells."
    );
  }
  const [solved, result] = await workerTaskWithTimeout(
    (proxy) => proxy.solve(regionWidth, regionHeight, cells),
    TIMEOUT
  );
  if (!solved) {
    throw new Error("The given puzzle has no solution.");
  }
  return {
    regionWidth,
    regionHeight,
    size,
    cells: result,
  };
}

export function solveSync({
  regionWidth,
  regionHeight,
  cells,
}: SolveArguments) {
  const size = (regionWidth * regionHeight) ** 2;
  if (size !== cells.length) {
    throw new Error(
      "The given region dimensions do not align with the number of cells."
    );
  }
  if (!SudokuMath.get(regionWidth, regionHeight).solve(cells)) {
    throw new Error("The given puzzle has no solution.");
  }
  return {
    regionWidth,
    regionHeight,
    size,
    cells,
  };
}
