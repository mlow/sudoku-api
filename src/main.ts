import { Application, bodyParser } from "./mods.js";
import { applyGraphQL } from "./graphql.js";
import { typeDefs, resolvers } from "./graphql/index.js";
import {
  initializeWorkers,
  solve,
  generate,
  solveSync,
  generateSync,
} from "./sudoku/index.js";
import stoppable from "stoppable";

import cors from "@koa/cors";

const runtime: { server: undefined | stoppable.StoppableServer } = {
  server: undefined,
};

async function main() {
  const app = new Application();

  app.use(cors());

  app.use(
    bodyParser({
      enableTypes: ["json"],
    })
  );

  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(
      `\x1b[32m%s\x1b[0m %s \x1b[32m%dms\x1b[0m\n---`,
      ctx.request.method,
      ctx.request.url,
      Date.now() - start
    );
  });

  let sudokuFuncs: any;
  if (process.env.USE_WORKER_THREADS) {
    initializeWorkers();
    sudokuFuncs = {
      solve,
      generate,
    };
  } else {
    sudokuFuncs = {
      solve: solveSync,
      generate: generateSync,
    };
  }

  applyGraphQL({
    app,
    typeDefs: typeDefs,
    resolvers: resolvers,
    context: () => sudokuFuncs,
  });

  runtime.server = stoppable(
    app.listen({ port: parseInt(process.env.LISTEN_PORT!) || 4000 }, () => {
      console.log(
        `Server listening at http://localhost:${
          process.env.LISTEN_PORT || 4000
        }\n---`
      );
    })
  );
}

["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, async () => {
    console.log("\nCaught", sig);
    console.log("Shutting down...");

    if (runtime.server) {
      runtime.server.stop((error, gracefully) => {
        if (error) {
          console.error(error);
          process.exit(2);
        } else if (!gracefully) {
          console.warn("Server was not shut down gracefully.");
          process.exit(1);
        } else {
          process.exit(0);
        }
      });
    } else {
      process.exit();
    }
  });
});

main();
