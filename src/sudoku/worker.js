import { SudokuMath } from "./math.js";
import { expose } from "threads/worker";

expose({
  generate(regionWidth, regionHeight, clues) {
    return SudokuMath.get(regionWidth, regionHeight).generate(clues);
  },
  solve(regionWidth, regionHeight, cells) {
    const result = SudokuMath.get(regionWidth, regionHeight).solve(cells);
    return [result, cells];
  },
});
