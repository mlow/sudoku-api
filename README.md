# sudoku-api 
A GraphQL Sudoku API.

## Features
* Generates and solves puzzles.
* Optimized with [Knuth's Algorithm X](https://en.wikipedia.org/wiki/Knuth%27s_Algorithm_X)

## Environment Variables:
```
# Service responds at http://localhost:$LISTEN_PORT/graphql
LISTEN_PORT=4000

# Enables worker threads, otherwise a long-running generation task
# can block the main thread.
USE_WORKER_THREADS=y
```
