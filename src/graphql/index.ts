import { mergeTypeDefs, mergeResolvers } from "../mods.js";
import * as sudoku from "./sudoku.js";

const modules = [sudoku];

export const typeDefs = mergeTypeDefs(modules.map((mod) => mod.typeDefs));
export const resolvers = mergeResolvers(modules.map((mod) => mod.resolvers));
