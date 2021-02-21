import { gql } from "../mods";
import { generate, GenerateArguments } from "../sudoku/index";

export const typeDefs = gql`
  type Cell {
    value: Int
  }
  """
  A sudoku
  """
  type Sudoku {
    "The width of each region."
    regionWidth: Int!

    "The height of each region."
    regionHeight: Int!

    "The total number of cells in the board."
    cells: Int!

    "The 'raw' board, an array of cells in region-first order."
    raw: [Cell!]!

    "The rows of the board, from top to bottom."
    rows: [[Cell!]!]!

    "The columns of the board, from left to right."
    columns: [[Cell!]!]!

    "The regions of the board, book-ordered."
    regions: [[Cell!]!]!
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
