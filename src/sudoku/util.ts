import { Cell } from "./index";

function randInt(lower: number, upper: number) {
  return lower + Math.trunc(Math.random() * (upper - lower + 1));
}

export function shuffle(arr: any[]) {
  const length = arr.length;
  let lastIndex = length - 1;
  for (let i = 0; i < length; i++) {
    const rand = randInt(i, lastIndex);
    const tmp = arr[rand];

    arr[rand] = arr[i];
    arr[i] = tmp;
  }
  return arr;
}

export function chunkify(arr: any[], chunkSize: number) {
  const chunks = Array(arr.length / chunkSize);
  for (let i = 0, len = chunks.length; i < len; i++) {
    const start = i * chunkSize;
    chunks[i] = arr.slice(start, start + chunkSize);
  }
  return chunks;
}

export function range(start: number, end: number) {
  return Array(1 + end - start)
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
  return puzz.map(({ value }) => ({ value }));
}

export function addCellValuesToSet(set: Set<number>, cells: Cell[]) {
  cells.forEach((cell) => {
    if (!!cell.value) set.add(cell.value);
  });
  return set;
}
