import { SudokuMath } from "./math";

export type Cell = { value: number | null };
export type CellArray = Cell[];
export type Row = CellArray;
export type Column = CellArray;
export type Region = CellArray;
export type Puzzle = CellArray;

export type Sudoku = {
  regionWidth: number;
  regionHeight: number;
  cells: number;
  raw: Puzzle;
  rows: () => Row[];
  columns: () => Column[];
  regions: () => Region[];
};

export function generate(
  regionWidth: number,
  regionHeight: number,
  clues: number
): Sudoku {
  const math = new SudokuMath(regionWidth, regionHeight);
  const puzzle = math.generatePuzzle(clues);

  return {
    regionWidth,
    regionHeight,
    cells: math.boardCells,
    raw: puzzle,
    rows: () => math.regionsToRows(puzzle, true),
    columns: () => math.regionsToCols(puzzle, true),
    regions: () => math.chunkRegions(puzzle),
  };
}
