export class DNode {
  up: DNode;
  down: DNode;
  left: DNode;
  right: DNode;
  column: CNode;
  meta: any;

  constructor(column: CNode) {
    this.up = this.down = this.left = this.right = this;
    this.column = column;
  }
}

export class CNode extends DNode {
  left: CNode;
  right: CNode;

  size: number;
  name: string | undefined;

  constructor(name = undefined) {
    super(null!);
    this.column = this;

    this.size = 0;
    this.name = name;
    this.left = this.right = this;
  }
}

type SolutionCallback = (output: DNode[]) => boolean;
type ColumnSelector = (header: CNode) => CNode;

function selectColumnSizeHeuristic(header: CNode): CNode {
  let minColumn = header.right;
  let curColumn = minColumn;
  while ((curColumn = curColumn.right) !== header) {
    if (curColumn.size < minColumn.size) {
      minColumn = curColumn;
    }
  }
  return minColumn;
}

export function linkNodesLR(nodes: DNode[]) {
  // given an array of nodes, link them together left-to-right circularly
  let last = nodes[0];
  for (let j = 1; j < nodes.length; j++) {
    const node = nodes[j];
    last.right = node;
    node.left = last;
    last = node;
  }

  nodes[0].left = last;
  last.right = nodes[0];
  return nodes;
}

export function addNodeToColumn(column: CNode, meta: any) {
  column.size++;

  let node = new DNode(column);
  node.down = column; // new last node, points down to column
  node.up = column.up; // new last node points up to previous last node

  // previous last node points down and column points up to new node,
  // repairing the circle
  column.up.down = column.up = node;

  node.meta = meta;
  return node;
}

export function maskRow(node: DNode) {
  let row = node;
  do {
    row.column.size--;
    row.down.up = row.up;
    row.up.down = row.down;
  } while ((row = row.right) !== node);
}

export function unmaskRow(node: DNode) {
  let row = node;
  do {
    row.column.size++;
    row.down.up = row.up.down = row;
  } while ((row = row.right) !== node);
}

export class DLX {
  header: CNode;
  updates: number = 0;
  callback: SolutionCallback;
  columnSelector: ColumnSelector;

  constructor(
    header: CNode,
    callback: SolutionCallback = () => false,
    columnSelector: ColumnSelector = selectColumnSizeHeuristic
  ) {
    this.header = header;
    this.callback = callback;
    this.columnSelector = columnSelector;
  }

  cover(c: CNode) {
    // remove c from column header list
    c.right.left = c.left;
    c.left.right = c.right;
    this.updates++;

    let row = c as DNode;
    while ((row = row.down) !== c) {
      // traverse DOWN the rows this column contained
      let col = row;
      while ((col = col.right) !== row) {
        // traverse the columns of this row (to the RIGHT)

        // remove this node from its column, and shrink its column's size
        this.updates++;
        col.up.down = col.down;
        col.down.up = col.up;
        col.column.size--;
      }
    }
  }

  uncover(c: CNode) {
    let row = c as DNode;
    while ((row = row.up) !== c) {
      // traverse UP the rows this column contained
      let col = row;
      while ((col = col.left) !== row) {
        // traverse the columns of this row (to the LEFT)

        // do the inverse of cover()
        this.updates++;
        col.up.down = col.down.up = col;
        col.column.size++;
      }
    }
    // insert c back into column header list
    this.updates++;
    c.left.right = c.right.left = c;
  }

  solution: DNode[] = [];

  _search(k: number): boolean {
    if (this.header.right === this.header) {
      return this.callback(this.solution);
    }

    const column = this.columnSelector(this.header);
    this.cover(column);

    let complete = false;
    let row = column as DNode;
    while ((row = row.down) !== column) {
      // add this row to the partial solution
      this.solution[k] = row;

      // cover the columns of every other node on this row
      let curCol = row;
      while ((curCol = curCol.right) !== row) {
        this.cover(curCol.column);
      }

      complete = this._search(k + 1);

      curCol = row;
      while ((curCol = curCol.left) !== row) {
        this.uncover(curCol.column);
      }

      if (complete) break;
    }

    this.uncover(column);
    return complete;
  }

  search() {
    this.updates = 0;
    this._search(0);
  }
}
