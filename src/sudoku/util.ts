import { Cell } from "./index";

export function randInt(lower: number, upper: number) {
  return Math.floor(Math.random() * (upper - lower)) + lower;
}

export function shuffle<T>(arr: T[]) {
  const length = arr.length;
  const last = length;
  for (let i = 0; i < length; i++) {
    const rand = randInt(i, last);
    const tmp = arr[rand];

    arr[rand] = arr[i];
    arr[i] = tmp;
  }
  return arr;
}

export function chunkify<T>(arr: T[], chunkSize: number) {
  const chunks = Array<T[]>(arr.length / chunkSize);
  for (let i = 0, len = chunks.length; i < len; i++) {
    const start = i * chunkSize;
    chunks[i] = arr.slice(start, start + chunkSize);
  }
  return chunks;
}

export function range(start: number, end: number) {
  return Array(end - start)
    .fill(null)
    .map((_, i) => start + i);
}

/**
 * Re-orders an array. Given an array of elements, return a new array of those
 * elements ordered by the indexes array.
 *
 * @param arr
 * @param indexes
 */
export function mapArray(arr: any[], indexes: number[]) {
  const newArr = Array(indexes.length);
  for (let i = 0, len = arr.length; i < len; i++) {
    newArr[i] = arr[indexes[i]];
  }
  return newArr;
}

export function clone(puzz: Cell[]): Cell[] {
  return Array.from(puzz);
}

export function addCellValuesToSet(set: Set<number>, cells: Cell[]) {
  cells.forEach((cell) => {
    if (cell > 0) set.add(cell);
  });
  return set;
}

export function prettyPrint(width: number, height: number, cells: Cell[]) {
  const side = width * height;
  let line = "";
  cells.forEach((cell, i) => {
    if (i > 0 && i % side == 0) {
      console.log(line);
      line = "";

      if (i > 0 && Math.floor(i / side) % height == 0) {
        let divider = "";
        Array(width * height)
          .fill(null)
          .forEach((_, j) => {
            if (j > 0 && j % width == 0) {
              divider += "  ";
            }
            divider += "---";
          });
        console.log(divider);
      }
    }

    if (i % side !== 0 && i % width === 0) {
      line += "| ";
    }

    line += (cell > 0 ? `${cell}` : "").padStart(2, " ") + " ";
  });
  console.log(line);
}
