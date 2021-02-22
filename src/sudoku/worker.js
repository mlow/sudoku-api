const { SudokuMath } = require("./math");
const { parentPort } = require("worker_threads");

const maths = {};

parentPort.on("message", ({ regionWidth, regionHeight, clues }) => {
  const math =
    maths[`${regionWidth}:${regionHeight}`] ||
    (maths[`${regionWidth}:${regionHeight}`] = new SudokuMath(
      regionWidth,
      regionHeight
    ));
  const puzzle = math.generate(clues);
  parentPort.postMessage(puzzle);
});
