// @ts-ignore
import { nds } from "../../Network"

type Levels = Record<string | number, number>;
type Id = string | number;
interface Edge {
  connected: boolean;
  from: Node;
  fromId: Id;
  to: Node;
  toId: Id;
}
interface Node {
  id: Id;
  edges: Edge[];
  lvl?: number;
}

interface NodeIdLvl {
  id: Id;
  lvl: number;
}

/**
 * Try to assign levels to nodes according to their positions in the cyclic “hierarchy”.
 *
 * @param nodes - Visible nodes of the graph.
 * @param levels - If present levels will be added to it, if not a new object will be created.
 *
 * @returns Populated node levels.
 */
function fillLevelsByDirectionCyclic(
  nodes: Map<Id, Node>,
  levels: Levels
): Levels {
  const edges = new Set<Edge>();
  nodes.forEach((node): void => {
    node.edges.forEach((edge): void => {
      if (edge.connected) {
        edges.add(edge);
      }
    });
  });

  edges.forEach((edge): void => {
    const fromId = edge.from.id;
    const toId = edge.to.id;

    if (levels[fromId] == null) {
      levels[fromId] = 0;
    }

    if (levels[toId] == null || levels[fromId] >= levels[toId]) {
      levels[toId] = levels[fromId] + 1;
    }
  });

  return levels;
}

/**
 * Assign levels to nodes according to their positions in the hierarchy. Leaves will be lined up at the bottom and all other nodes as close to their children as possible.
 *
 * @param nodes - Visible nodes of the graph.
 *
 * @returns Populated node levels.
 */
export function fillLevelsByDirectionLeaves(nodes: Map<Id, Node>): Levels {
  return fillLevelsByDirection(
    // Pick only leaves (nodes without children).
    (node): boolean =>
      node.edges
        // Take only visible nodes into account.
        .filter((edge): boolean => nodes.has(edge.toId))
        // Check that all edges lead to this node (leaf).
        .every((edge): boolean => edge.to === node),
    // Use the lowest level.
    (newLevel, oldLevel): boolean => oldLevel > newLevel,
    // Go against the direction of the edges.
    "from",
    nodes
  );
}

/**
 * Assign levels to nodes according to their positions in the hierarchy. Roots will be lined up at the top and all nodes as close to their parents as possible.
 *
 * @param nodes - Visible nodes of the graph.
 *
 * @returns Populated node levels.
 */
export function fillLevelsByDirectionRoots(nodes: Map<Id, Node>): Levels {
  return fillLevelsByDirection(
    // Pick only roots (nodes without parents).
    (node): boolean =>
      node.edges
        // Take only visible nodes into account.
        .filter((edge): boolean => nodes.has(edge.toId))
        // Check that all edges lead from this node (root).
        .every((edge): boolean => edge.from === node),
    // Use the highest level.
    (newLevel, oldLevel): boolean => oldLevel < newLevel,
    // Go in the direction of the edges.
    "to",
    nodes
  );
}

/**
 * Assign levels to nodes according to their positions in the hierarchy.
 *
 * @param isEntryNode - Checks and return true if the graph should be traversed from this node.
 * @param shouldLevelBeReplaced - Checks and returns true if the level of given node should be updated to the new value.
 * @param direction - Wheter the graph should be traversed in the direction of the edges `"to"` or in the other way `"from"`.
 * @param nodes - Visible nodes of the graph.
 *
 * @returns Populated node levels.
 */
function fillLevelsByDirection(
  isEntryNode: (node: Node) => boolean,
  shouldLevelBeReplaced: (newLevel: number, oldLevel: number) => boolean,
  direction: "to" | "from",
  nodes: Map<Id, Node>
): Levels {
  const levels = Object.create(null);

  // If acyclic, the graph can be walked through with (most likely way) fewer
  // steps than the number bellow. The exact value isn't too important as long
  // as it's quick to compute (doesn't impact acyclic graphs too much), is
  // higher than the number of steps actually needed (doesn't cut off before
  // acyclic graph is walked through) and prevents infinite loops (cuts off for
  // cyclic graphs).
  const limit = [...nodes.values()].reduce<number>(
    (acc, node): number => acc + 1 + node.edges.length,
    0
  );

  const edgeIdProp: "fromId" | "toId" = (direction + "Id") as "fromId" | "toId";
  const newLevelDiff = direction === "to" ? 1 : -1;

  for (const [entryNodeId, entryNode] of nodes) {
    if (
      // Skip if the node is not visible.
      !nodes.has(entryNodeId) ||
      // Skip if the node is not an entry node.
      !isEntryNode(entryNode)
    ) {
      continue;
    }

    // Line up all the entry nodes on level 0.
    levels[entryNodeId] = 0;

    const stack: Node[] = [entryNode];
    let done = 0;
    let node: Node | undefined;
    while ((node = stack.pop())) {
      if (!nodes.has(entryNodeId)) {
        // Skip if the node is not visible.
        continue;
      }

      const newLevel = levels[node.id] + newLevelDiff;

      node.edges
        .filter(
          (edge): boolean =>
            // Ignore disconnected edges.
            edge.connected &&
            // Ignore circular edges.
            edge.to !== edge.from &&
            // Ignore edges leading to the node that's currently being processed.
            edge[direction] !== node &&
            // Ignore edges connecting to an invisible node.
            nodes.has(edge.toId) &&
            // Ignore edges connecting from an invisible node.
            nodes.has(edge.fromId)
        )
        .forEach((edge): void => {
          const targetNodeId = edge[edgeIdProp];
          const oldLevel = levels[targetNodeId];

          if (oldLevel == null || shouldLevelBeReplaced(newLevel, oldLevel)) {
            levels[targetNodeId] = newLevel;
            stack.push(edge[direction]);
          }
        });

      if (done > limit) {
        // This would run forever on a cyclic graph.
        return fillLevelsByDirectionCyclic(nodes, levels);
      } else {
        ++done;
      }
    }
  }
  console.log("node array in layout");
  console.log(nodes);

  console.log("levels after complete");
  console.log(levels);

  console.log("nds in layout");
  console.log(nds);

  // something strange here
  /*nodes.forEach((node) => {
    for (let i = 0; i < nds.length; i++)
      if (nds[i].id == node.id) {
        console.log("Changed "+ levels[i]+ " on ", nds[i].lvl +"\n");
        levels[i] = nds[i].lvl;
        return;
      }
  })*/
  setTimeout(() => {
    /*for (let i = 0; i < nds.length; i++)
      levels[i] = -1;*/
    if (nds.length != 0)
    {
      nds.forEach((node, i) => {
        //console.log("Before = on " + i + " , lvl[i] = " + levels[i] + " , node(i).lvl = " + node.lvl);
        levels[i] = node.lvl; //no space betwen longlive nodes
        //console.log("After = on "+ i + " , lvl[i] = " + levels[i] + " , node(i).lvl = " + node.lvl);
      });
      /*for (let i = 0; i < nds.length; i++)
        levels[i] = (levels[i] === -1)  ?  i : levels[i];*/
    }
  });//was timeout);


  console.log("levels in new system");
  console.log(levels);
  return levels;
}
