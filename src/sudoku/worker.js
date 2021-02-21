const { SudokuMath } = require("./math");
const { parentPort } = require("worker_threads");

parentPort.on("message", ({ regionWidth, regionHeight, clues }) => {
  const math = new SudokuMath(regionWidth, regionHeight);
  const puzzle = math.generatePuzzle(clues);
  parentPort.postMessage([math, puzzle]);
});
