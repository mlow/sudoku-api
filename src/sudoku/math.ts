import {
  DLX,
  DNode,
  CNode,
  linkNodesLR,
  addNodeToColumn,
  maskRow,
  unmaskRow,
} from "./dlx";
import { shuffle, range } from "./util";
import { Cell } from "./index";

type NodeMeta = {
  row: number;
  col: number;
  region: number;
  value: number;
};

type BoardInfo = [number, number, number, number, number];

export class SudokuMath {
  regionWidth: number;
  regionHeight: number;

  values: number;
  values2: number;

  indexes: number[];

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
    return [candidate, row, col, region, val];
  }

  _checkInput(cells: Cell[][]) {
    if (cells.length !== this.values || cells[0].length !== this.values) {
      throw new Error(
        "Given cells array does not match regionWidth & regionHeight"
      );
    }
  }

  // this takes a bit of time and the value may need to be cached
  getDLXHeader(
    cells: undefined | Cell[][] = undefined,
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
    candidates.forEach(([i, row, col, region, val]) => {
      if (cells) {
        const exist = cells[row][col].value;
        if (exist && exist - 1 !== val) {
          // skip candidates matching this constraint's position, but not its value
          // the effect is the exisitng value is preserved in the output
          return;
        }
      }

      const meta = { row, col, region, value: val + 1 };
      const dlxRow = linkNodesLR(
        this.getConstraintIDs(val, row, col, region).map((id) =>
          addNodeToColumn(constraints[id], meta)
        )
      );
      dlxRows.push(dlxRow[0]);
    });

    return [header, dlxRows];
  }

  _baseBoard(): Cell[][] {
    // return a sudoku board with a random set of values in the first row
    // used in generateComplete for small speedup
    const firstRow = range(1, this.values + 1);
    shuffle(firstRow);
    return [
      firstRow.map((value) => ({ value })),
      ...Array(this.values - 1)
        .fill(null)
        .map(() =>
          Array(this.values)
            .fill(0)
            .map((val) => ({ value: val > 0 ? val : null }))
        ),
    ];
  }

  generateComplete() {
    const result = this._baseBoard();
    const [header] = this.getDLXHeader(result, true);

    const callback = (solution: DNode[]) => {
      solution.forEach((node) => {
        const meta: NodeMeta = node.meta;
        result[meta.row][meta.col] = { value: meta.value };
      });
      // return the first solution
      return true;
    };

    const dlx = new DLX(header, callback);

    dlx.search();
    return result;
  }

  generate(clues: number, attempts = Infinity, totalTime = Infinity) {
    const completed = this.generateComplete();

    const [header, dlxRows] = this.getDLXHeader(); // complete header - no candidates removed

    let solutions = 0;
    const dlx = new DLX(header, () => ++solutions >= 2);

    const candidates: DNode[][][] = Array.from(Array(this.values), () =>
      Array.from(Array(this.values), () => Array(this.values))
    );
    dlxRows.forEach((node) => {
      const meta = node.meta;
      candidates[meta.row][meta.col][meta.value - 1] = node;
    });

    // board positions which have been removed, in the order they've been removed
    const removed: Set<number> = new Set();
    const masked: DNode[] = [];

    const hasOneSolution = () => {
      solutions = 0;
      dlx.search();
      return solutions === 1;
    };

    const mask = () => {
      // mask all DLX rows which are nullified by existing values
      for (let n = 0; n < this.values2; n++) {
        if (removed.has(n)) {
          continue;
        }
        const row = Math.floor(n / this.values);
        const col = n % this.values;
        const existValue = completed[row][col].value;
        const nodes = candidates[row][col];
        // console.log(row, col);
        // console.log(existValue);
        nodes.forEach((node) => {
          if (node.meta.value !== existValue) {
            // console.log(node.meta);
            // console.log("masking node");
            masked.push(node);
            maskRow(node);
          }
        });
      }
    };

    const unmask = () => {
      // unmask all DLX rows
      while (masked.length > 0) {
        unmaskRow(masked.pop()!);
      }
    };

    const start = Date.now();
    const elapsed = () => Date.now() - start;

    const removeable = Array.from(this.indexes);
    const attempt = () => {
      // attempt remove cells until 'clues' cells remain
      shuffle(removeable);
      for (let n = 0; n < this.values2; n++) {
        if (elapsed() > totalTime || this.values2 - removed.size == clues) {
          break;
        }

        let toRemove = removeable[n];
        removed.add(toRemove);
        mask();

        if (!hasOneSolution()) {
          removed.delete(toRemove);
        }

        unmask();
      }
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
      completed[Math.floor(index / this.values)][
        index % this.values
      ].value = null;
    });
    return completed;
  }

  solve(existing: Cell[][]): void {
    const [header] = this.getDLXHeader(existing);
    const callback = (solution: DNode[]) => {
      solution.forEach((node) => {
        const meta: NodeMeta = node.meta;
        existing[meta.row][meta.col] = { value: meta.value };
      });
      // return the first solution
      return true;
    };
    new DLX(header, callback).search();
  }
}
