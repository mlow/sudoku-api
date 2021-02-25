import { gql } from "../mods.js";
import { generate, GenerateArguments } from "../sudoku/index.js";

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
  }
`;

export const resolvers = {
  Query: {
    generate: (
      obj: any,
      { regionWidth, regionHeight, clues }: GenerateArguments
    ) => {
      return generate(regionWidth, regionHeight, clues);
    },
  },
};
