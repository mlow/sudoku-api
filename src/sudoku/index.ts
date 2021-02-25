import { spawn, Thread, Worker } from "threads";

import WORKERS from "physical-cpu-count";
import { prettyPrint } from "./util.js";

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

function getWorker() {
  return spawn(new Worker("./worker"));
}

const available: any = [];

function initialize() {
  console.log(`Starting ${WORKERS} worker threads`);
  for (let n = 0; n < WORKERS; n++) {
    getWorker().then((worker) => available.push(worker));
  }
}
initialize();

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

export async function generate(
  regionWidth: number,
  regionHeight: number,
  clues: number
): Promise<Sudoku> {
  const proxy = available.pop();
  if (!proxy) {
    throw new Error("No workers available right now. Please try again.");
  }

  const puzzle = await withTimeout<number[]>(
    proxy.generate(regionWidth, regionHeight, clues),
    TIMEOUT,
    () => {
      Thread.terminate(proxy);
      getWorker().then((worker) => available.push(worker));
      return new Error("Timed out. Try reducing the number of clues.");
    }
  );

  available.push(proxy);
  prettyPrint(regionWidth, regionHeight, puzzle);
  return {
    regionWidth,
    regionHeight,
    size: (regionWidth * regionHeight) ** 2,
    cells: puzzle,
  };
}
