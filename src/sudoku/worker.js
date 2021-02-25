import { SudokuMath } from "./math.js";
import { expose } from "threads/worker";

const maths = {};

expose({
  generate(regionWidth, regionHeight, clues) {
    const key = `${regionWidth}:${regionHeight}`;
    const math =
      maths[key] ?? (maths[key] = new SudokuMath(regionWidth, regionHeight));
    return math.generate(clues);
  },
});
