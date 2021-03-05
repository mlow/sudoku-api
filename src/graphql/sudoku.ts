import { gql } from "../mods.js";
import { Sudoku, GenerateArguments, SolveArguments } from "../sudoku/index.js";

export const typeDefs = gql`
  """
  A sudoku
  """
  type Sudoku {
    "The width of each region."
    regionWidth: Int!

    "The height of each region."
    regionHeight: Int!

    "The number of cells in the board."
    size: Int!

    "The rows of the board, from top to bottom."
    cells: [Int!]!
  }

  type Query {
    "Generates a new sudoku."
    generate(regionWidth: Int = 3, regionHeight: Int = 3, clues: Int!): Sudoku!

    "Solves the given sudoku."
    solve(regionWidth: Int = 3, regionHeight: Int = 3, cells: [Int!]!): Sudoku!
  }
`;

interface SudokuFuncs {
  solve(args: SolveArguments): Promise<Sudoku> | Sudoku;
  generate(args: GenerateArguments): Promise<Sudoku> | Sudoku;
}

export const resolvers = {
  Query: {
    generate: (obj: any, args: GenerateArguments, ctx: SudokuFuncs) =>
      ctx.generate(args),
    solve: (obj: any, args: SolveArguments, ctx: SudokuFuncs) =>
      ctx.solve(args),
  },
};
