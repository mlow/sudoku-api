import { Cell, Row, Column, Region, Puzzle } from "./index";
import {
  clone,
  range,
  shuffle,
  chunkify,
  mapArray,
  addCellValuesToSet,
} from "./util";

function getTakenValues(region: Region, row: Row, col: Column) {
  const filter = new Set<number>();
  addCellValuesToSet(filter, region);
  addCellValuesToSet(filter, row);
  addCellValuesToSet(filter, col);
  return filter;
}

export class SudokuMath {
  regionWidth: number;
  regionHeight: number;
  boardWidth: number;
  boardHeight: number;
  width: number;
  height: number;
  boardCells: number;
  regionCells: number;
  legalValues: number[];

  _regionsFromIndex: number[];
  _rowsFromIndex: number[];
  _colsFromIndex: number[];
  _rowIndexToRegionIndex: number[];
  _colIndexToRegionIndex: number[];
  _regionIndexToRowIndex: number[];
  _regionIndexToColIndex: number[];

  constructor(regionWidth: number, regionHeight: number) {
    this.regionWidth = regionWidth;
    this.regionHeight = regionHeight;
    this.boardWidth = regionHeight;
    this.boardHeight = regionWidth;
    this.width = regionWidth * this.boardWidth;
    this.height = regionHeight * this.boardHeight;
    this.boardCells = this.width * this.height;
    this.regionCells = regionWidth * regionHeight;
    this.legalValues = range(1, this.regionCells);

    this._regionsFromIndex = Array(this.boardCells);
    this._rowsFromIndex = Array(this.boardCells);
    this._colsFromIndex = Array(this.boardCells);
    this._rowIndexToRegionIndex = Array(this.boardCells);
    this._colIndexToRegionIndex = Array(this.boardCells);
    this._regionIndexToRowIndex = Array(this.boardCells);
    this._regionIndexToColIndex = Array(this.boardCells);

    for (let i = 0; i < this.boardCells; i++) {
      this._regionsFromIndex[i] = this._regionFromRegionIndex(i);

      const [row, col] = this._rowColFromRegionIndex(i);
      this._rowsFromIndex[i] = row;
      this._colsFromIndex[i] = col;

      const rowIndex = row * this.width + col;
      const colIndex = col * this.height + row;
      this._rowIndexToRegionIndex[rowIndex] = i;
      this._colIndexToRegionIndex[i] = rowIndex;
      this._regionIndexToRowIndex[i] = rowIndex;
      this._regionIndexToColIndex[colIndex] = i;
    }
  }

  _regionFromRegionIndex(i: number) {
    return Math.trunc(i / this.regionCells);
  }

  regionFromRegionIndex(i: number) {
    return this._regionsFromIndex[i];
  }

  _rowColFromRegionIndex(i: number) {
    const region = this.regionFromRegionIndex(i);
    const cell = i % this.regionCells;
    const regionRow = Math.trunc(region / this.boardWidth);
    const regionCol = region % this.boardWidth;
    const cellRow = Math.trunc(cell / this.regionWidth);
    const cellCol = cell % this.regionWidth;
    return [
      regionRow * this.regionHeight + cellRow,
      regionCol * this.regionWidth + cellCol,
    ];
  }

  rowColFromRegionIndex(i: number) {
    return [this._rowsFromIndex[i], this._colsFromIndex[i]];
  }

  regionIndexToRowIndex(i: number) {
    return this._regionIndexToRowIndex[i];
  }

  rowIndexToRegionIndex(i: number) {
    return this._rowIndexToRegionIndex[i];
  }

  regionIndexToColIndex(i: number) {
    return this._regionIndexToColIndex[i];
  }

  colIndexToRegionIndex(i: number) {
    return this._colIndexToRegionIndex[i];
  }

  chunkRegions(cells: Cell[]) {
    return chunkify(cells, this.regionCells);
  }

  regionsToRows(cells: Cell[], split = false) {
    const rows = mapArray(cells, this._regionIndexToRowIndex);
    return split ? chunkify(rows, this.width) : rows;
  }

  regionsToCols(cells: Cell[], split = false) {
    const cols = mapArray(cells, this._regionIndexToColIndex);
    return split ? chunkify(cols, this.height) : cols;
  }

  rowsToRegions(cells: Cell[], split = false) {
    const regions = mapArray(cells, this._rowIndexToRegionIndex);
    return split ? chunkify(regions, this.regionCells) : regions;
  }

  colsToRegions(cells: Cell[], split = false) {
    const regions = mapArray(cells, this._colIndexToRegionIndex);
    return split ? chunkify(regions, this.regionCells) : regions;
  }

  getBlankPuzzle(): Puzzle {
    return Array(this.boardCells)
      .fill(null)
      .map((value) => ({ value }));
  }

  /**
   * Returns the remaining legal values given a set of taken values.
   *
   * @param taken a set of taken values
   */
  getLegalValues(taken: Set<number>) {
    return this.legalValues.filter((value) => !taken.has(value));
  }

  /**
   * Returns which values are unavailable at a given location, looking at the
   * row, column, and region of the given cell index.
   *
   * @param cell
   * @param puzzle
   * @param regions
   */
  getTakenValues(cell: number, puzzle: Puzzle, regions: Region[]) {
    const rows = this.regionsToRows(puzzle, true);
    const cols = this.regionsToCols(puzzle, true);
    const [row, col] = this.rowColFromRegionIndex(cell);
    const region = this.regionFromRegionIndex(cell);
    return getTakenValues(regions[region], rows[row], cols[col]);
  }

  /**
   * Returns whether a puzzle has only one solution.
   *
   * @param puzzle
   */
  hasOneSolution(puzzle: Cell[]) {
    const optimistic = clone(puzzle);
    if (this.optimisticSolver(optimistic)) {
      return true;
    }
    return this.backTrackingSolver(optimistic, 2) === 1;
  }

  /**
   * Generates a single-solution sudoku puzzle with
   *
   * @param clues the number of cells to have pre-filled
   */
  generatePuzzle(clues: number) {
    const puzzle = this.getBlankPuzzle();
    this.backTrackingSolver(puzzle, 1, shuffle);

    if (clues === -1 || clues >= puzzle.length) return puzzle;

    const orig = clone(puzzle);

    const toRemove = puzzle.length - clues;
    let removed: number[] = [];
    let removeNext: number[] = shuffle(puzzle.map((_, i) => i));

    const remove = () => {
      const x = removeNext.shift() as any;
      removed.push(x);
      puzzle[x].value = null;
    };

    const replace = () => {
      const x = removed.pop() as any;
      removeNext.push(x);
      puzzle[x].value = orig[x].value;
    };

    const removeCell = () => {
      remove();
      if (this.hasOneSolution(puzzle)) {
        return true;
      }
      replace();
      return false;
    };

    let fails = 0;
    while (removed.length < toRemove) {
      if (!removeCell()) {
        fails++;
      } else {
        console.log(`Removed ${removed.length} cells.`);
        fails = 0;
      }
      if (fails > removeNext.length) {
        fails = 0;
        console.log("Backstepping..");
        Array(removed.length)
          .fill(null)
          .forEach(() => replace());
        shuffle(removeNext);
      }
    }

    return puzzle;
  }

  /**
   * Attempt to solve the puzzle "optimistically". Only sets values which are
   * certain, i.e. no guesses are made.
   *
   * Useful as a first pass.
   *
   * @param puzzle a region-ordered array of cells (each cell an object with
   *   a `value` key.
   * @returns whether the puzzle was completely solved
   */
  optimisticSolver(puzzle: Puzzle) {
    const regions = this.chunkRegions(puzzle);
    const rows = this.regionsToRows(puzzle, true);
    const cols = this.regionsToCols(puzzle, true);

    const solve = (): boolean => {
      let foundValue = false;
      let foundEmpty = false;

      for (let i = 0, len = puzzle.length; i < len; i++) {
        const cell = puzzle[i];
        if (!!cell.value) continue;
        foundEmpty = true;
        const region = this.regionFromRegionIndex(i);
        const [row, col] = this.rowColFromRegionIndex(i);
        const taken = getTakenValues(regions[region], rows[row], cols[col]);
        if (taken.size === this.regionCells - 1) {
          cell.value = this.getLegalValues(taken)[0];
          foundValue = true;
        }
      }
      return foundValue && foundEmpty ? solve() : !foundEmpty;
    };

    return solve();
  }

  /**
   * Backtracking solver. Mutates the puzzle during solve but eventually returns
   * it to its initial state.
   *
   * @param puzzle see optimisticSolver
   * @param stopAfter stop looking after this many solutions
   * @param guessStrategy a function which takes an array of possible
   *   values for a cell, and returns the same values (in any order)
   * @returns the number of solutions found
   */
  backTrackingSolver(
    puzzle: Puzzle,
    stopAfter: number = -1,
    guessStrategy: (values: number[]) => number[] = (values: number[]) => values
  ) {
    const regions = this.chunkRegions(puzzle);
    const rows = this.regionsToRows(puzzle, true);
    const cols = this.regionsToCols(puzzle, true);

    let solutions = 0;
    const solve = (): boolean => {
      for (let i = 0, len = puzzle.length; i < len; i++) {
        const cell = puzzle[i];
        if (!cell.value) {
          const region = this.regionFromRegionIndex(i);
          const [row, col] = this.rowColFromRegionIndex(i);
          const avail = guessStrategy(
            this.getLegalValues(
              getTakenValues(regions[region], rows[row], cols[col])
            )
          );
          for (let j = 0; j < avail.length; j++) {
            cell.value = avail[j];
            if (solve() && solutions === stopAfter) {
              return true;
            }
            cell.value = null;
          }
          return false;
        }
      }
      solutions++;
      return true;
    };

    solve();

    return solutions;
  }
}
