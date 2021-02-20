import { mergeTypeDefs, mergeResolvers } from "../mods";

const modules = [require("./sudoku")];

export const typeDefs = mergeTypeDefs(modules.map((mod) => mod.typeDefs));
export const resolvers = mergeResolvers(modules.map((mod) => mod.resolvers));
