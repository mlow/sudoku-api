import {
  DLX,
  DNode,
  CNode,
  linkNodesLR,
  addNodeToColumn,
  maskRow,
  unmaskRow,
} from "./dlx.js";
import { shuffle, range } from "./util.js";
import { Cell } from "./index.js";

type NodeMeta = {
  index: number;
  row: number;
  col: number;
  region: number;
  value: number;
};

type BoardInfo = [number, number, number, number, number];

export class SudokuMath {
  /** The width of each region */
  regionWidth: number;
  /** The height of each region */
  regionHeight: number;

  /** The number of unqiue values in this sudoku */
  values: number;
  /** The squared number of unique values - also the total number of cells */
  values2: number;

  /** An array of board indexes (a range from 0 to `values2 - 1`) */
  indexes: number[];

  /** A cache of the possible cadidate rows of this sudoku. */
  candidates: BoardInfo[];

  constructor(regionWidth: number, regionHeight: number) {
    this.regionWidth = regionWidth;
    this.regionHeight = regionHeight;

    this.values = regionWidth * regionHeight;
    this.values2 = this.values * this.values;

    this.indexes = Array(this.values2)
      .fill(null)
      .map((_, i) => i);

    this.candidates = Array.from(Array(this.values ** 3), (_, i) =>
      this.getRowColRegionValFromCandidate(i)
    );
  }

  getConstraintIDs(val: number, row: number, col: number, region: number) {
    return [
      // each cell has a value
      row * this.values + col,
      // each row has one of each value
      this.values2 + row * this.values + val,
      // each col has one of each value
      this.values2 * 2 + col * this.values + val,
      // each region has one of each value
      this.values2 * 3 + region * this.values + val,
    ];
  }

  getRowColRegionValFromCandidate(candidate: number): BoardInfo {
    const boardIndex = Math.floor(candidate / this.values);
    const row = Math.floor(boardIndex / this.values);
    const col = boardIndex % this.values;
    const region =
      Math.floor(row / this.regionHeight) * this.regionHeight +
      Math.floor(col / this.regionWidth);
    const val = candidate % this.values;
    return [boardIndex, row, col, region, val];
  }

  _checkInput(cells: Cell[]) {
    if (cells.length !== this.values2) {
      throw new Error(
        "Given cells array does not match regionWidth & regionHeight"
      );
    }
  }

  // this takes a bit of time and the value may need to be cached
  getDLXHeader(
    cells: undefined | Cell[] = undefined,
    randomSearch = false
  ): [CNode, DNode[]] {
    if (cells) this._checkInput(cells);

    const header = new CNode();
    header.name = "h";

    const constraints = new Array<CNode>(this.values2 * 4)
      .fill(null!)
      .map((_, i) => {
        const column = new CNode();
        column.name = `${i}`;
        column.meta = i;
        return column;
      });

    // link together the header and constraint columns
    linkNodesLR([header, ...constraints]);

    const candidates = randomSearch
      ? shuffle(Array.from(this.candidates))
      : this.candidates;

    const dlxRows: DNode[] = [];
    candidates.forEach(([boardIndex, row, col, region, val]) => {
      if (cells) {
        const exist = cells[boardIndex];
        if (exist && exist - 1 !== val) {
          // skip candidates matching this constraint's position, but not its value
          // the effect is the exisitng value is preserved in the output
          return;
        }
      }

      const meta = { index: boardIndex, row, col, region, value: val + 1 };
      const dlxRow = linkNodesLR(
        this.getConstraintIDs(val, row, col, region).map((id) =>
          addNodeToColumn(constraints[id], meta)
        )
      );
      dlxRows.push(dlxRow[0]);
    });

    return [header, dlxRows];
  }

  _baseBoard(): Cell[] {
    // return a sudoku board with a random set of values in the first row
    // used in generateComplete for small speedup
    const firstRow = shuffle(range(1, this.values + 1));
    return [...firstRow, ...Array(this.values2 - this.values).fill(0)];
  }

  generateComplete(): [number[], number] {
    const result = this._baseBoard();
    const [header] = this.getDLXHeader(result, true);
    const dlx = new DLX(header, (solution: DNode[]) => {
      solution.forEach((node) => {
        const meta: NodeMeta = node.meta;
        result[meta.index] = meta.value;
      });
      // stop after the first solution
      return true;
    });

    dlx.search();
    return [result, dlx.updates];
  }

  generate(clues: number, attempts = Infinity, totalTime = Infinity) {
    if (clues === 0) {
      return Array(this.values2).fill(0);
    }

    let [completed, updates] = this.generateComplete();

    const [header, dlxRows] = this.getDLXHeader(); // complete header - no candidates removed

    let solutions = 0;
    const dlx = new DLX(header, () => ++solutions >= 2);

    const candidates: DNode[][] = Array.from(Array(this.values2), () =>
      Array.from(Array(this.values))
    );
    dlxRows.forEach((node) => {
      const meta = node.meta;
      candidates[meta.index][meta.value - 1] = node;
    });

    const hasOneSolution = () => {
      solutions = 0;
      dlx.search();
      updates += dlx.updates;
      return solutions === 1;
    };

    const start = Date.now();
    const elapsed = () => Date.now() - start;

    // masked rows in the order they were masked
    const masked: DNode[] = [];

    const maskAtIdx = (idx: number) => {
      const nodes = candidates[idx];
      nodes.forEach((node) => {
        if (node.meta.value !== completed[idx]) {
          masked.push(node);
          maskRow(node);
        }
      });
    };

    const removed = new Set<number>();
    const removeable = Array.from(this.indexes);

    const maskUpto = (n: number) => {
      for (let j = 0; j < n; j++) {
        // process up to what we've handled
        const idx = removeable[j];
        if (removed.has(idx)) {
          // if we've removed this cell, do not mask it
          continue;
        }
        // otherwise, we had given up it; mask it leaving the original value
        // we won't try this cell again
        maskAtIdx(idx);
      }

      for (let j = this.values2 - 1; j >= n; j--) {
        // for all those we haven't handled, mask leaving the original values
        // for us to to attempt to unmask one cell at a time
        maskAtIdx(removeable[j]);
      }
    };

    const unmaskAll = () => {
      let node;
      while ((node = masked.pop())) {
        unmaskRow(node);
      }
    };

    const unmaskNextCell = () => {
      for (let j = 0; j < this.values - 1; j++) {
        unmaskRow(masked.pop()!);
      }
    };

    const attempt = () => {
      // attempt remove cells until 'clues' cells remain
      shuffle(removeable);
      maskUpto(0);

      for (let i = 0; i < this.values2; i++) {
        if (elapsed() > totalTime || this.values2 - removed.size == clues) {
          break;
        }

        unmaskNextCell();

        if (!hasOneSolution()) {
          // failed attempt. prepare for next
          unmaskAll();
          maskUpto(i + 1);
          continue;
        }

        removed.add(removeable[i]);
      }

      unmaskAll();
    };

    while (
      this.values2 - removed.size > clues &&
      attempts > 0 &&
      elapsed() < totalTime
    ) {
      // try to reach the clue goal up to `attempts` times or as long as
      // elapsed time is less than `totalTime`
      attempts--;
      removed.clear();
      attempt();
    }

    removed.forEach((index) => {
      completed[index] = 0;
    });
    console.log("DLX updates:", updates);
    return completed;
  }

  solve(existing: Cell[]): void {
    const [header] = this.getDLXHeader(existing);
    const callback = (solution: DNode[]) => {
      solution.forEach((node) => {
        const meta: NodeMeta = node.meta;
        existing[meta.index] = meta.value;
      });
      // return the first solution
      return true;
    };
    new DLX(header, callback).search();
  }
}
