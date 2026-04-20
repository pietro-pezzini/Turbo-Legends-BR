import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";

const RUBBER_LOG_ID = "turbo_legends_br:rubber_log";
const LATEX_ITEM_ID = "turbo_legends_br:latex";
const CUT_STATE_KEY = "turbo_legends_br:is_cut";
const REGEN_TICKS = 20 * 60 * 10;
const regenQueue = new Map();
const FLAG_OBJECTIVE_ID = "tlb_flags";
const GROVE_FLAG = "rubber_grove_generated_v1";
const REPLACEABLE_BLOCKS = new Set([
  "minecraft:air",
  "minecraft:cave_air",
  "minecraft:void_air",
  "minecraft:snow_layer",
  "minecraft:tallgrass",
  "minecraft:short_grass",
  "minecraft:fern",
  "minecraft:double_plant"
]);

function blockKey(block) {
  return `${block.dimension.id}|${block.location.x},${block.location.y},${block.location.z}`;
}

function isSword(itemStack) {
  if (!itemStack) return false;
  return itemStack.typeId.endsWith("_sword");
}

function getIsCut(block) {
  try {
    return block.permutation.getState(CUT_STATE_KEY) === true;
  } catch {
    return false;
  }
}

function setIsCut(block, value) {
  const updated = block.permutation.withState(CUT_STATE_KEY, value);
  block.setPermutation(updated);
}

function addLatexToPlayer(player) {
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory?.container) return false;
  return inventory.container.addItem(new ItemStack(LATEX_ITEM_ID, 1)) === undefined;
}

function getFlagsObjective() {
  let objective = world.scoreboard.getObjective(FLAG_OBJECTIVE_ID);
  if (!objective) {
    objective = world.scoreboard.addObjective(FLAG_OBJECTIVE_ID, "Turbo Legends Flags");
  }
  return objective;
}

function isGroveGenerated() {
  try {
    const score = getFlagsObjective().getScore(GROVE_FLAG);
    return score === 1;
  } catch {
    return false;
  }
}

function markGroveGenerated() {
  getFlagsObjective().setScore(GROVE_FLAG, 1);
}

function canReplaceBlock(block, targetTypeId) {
  if (!block) return false;
  if (block.typeId === targetTypeId) return true;
  return REPLACEABLE_BLOCKS.has(block.typeId);
}

function placeBlock(dimension, x, y, z, typeId) {
  const block = dimension.getBlock({ x, y, z });
  if (!canReplaceBlock(block, typeId)) return false;
  block.setPermutation(BlockPermutation.resolve(typeId));
  return true;
}

function generateRubberTree(dimension, origin) {
  const { x, y, z } = origin;
  const trunkPositions = [];
  const leafPositions = [];

  for (let dy = 0; dy < 4; dy += 1) {
    trunkPositions.push([x, y + dy, z]);
  }

  const leafOffsets = [
    [0, 3, 0],
    [1, 3, 0],
    [-1, 3, 0],
    [0, 3, 1],
    [0, 3, -1],
    [1, 4, 0],
    [-1, 4, 0],
    [0, 4, 1],
    [0, 4, -1],
    [0, 5, 0]
  ];

  for (const [lx, ly, lz] of trunkPositions) {
    const block = dimension.getBlock({ x: lx, y: ly, z: lz });
    if (!canReplaceBlock(block, RUBBER_LOG_ID)) return false;
  }

  for (const [dx, dy, dz] of leafOffsets) {
    leafPositions.push([x + dx, y + dy, z + dz]);
  }

  for (const [lx, ly, lz] of leafPositions) {
    const block = dimension.getBlock({ x: lx, y: ly, z: lz });
    if (!canReplaceBlock(block, "minecraft:oak_leaves")) return false;
  }

  for (const [lx, ly, lz] of trunkPositions) {
    placeBlock(dimension, lx, ly, lz, RUBBER_LOG_ID);
  }

  for (const [lx, ly, lz] of leafPositions) {
    placeBlock(dimension, lx, ly, lz, "minecraft:oak_leaves");
  }

  return true;
}

function generateRubberGrove(player) {
  if (isGroveGenerated()) return;

  const dimension = player.dimension;

  const baseX = Math.floor(player.location.x) + 4;
  const baseY = Math.floor(player.location.y);
  const baseZ = Math.floor(player.location.z) + 4;

  const generatedA = generateRubberTree(dimension, { x: baseX, y: baseY, z: baseZ });
  const generatedB = generateRubberTree(dimension, { x: baseX + 6, y: baseY, z: baseZ - 2 });

  if (generatedA || generatedB) {
    markGroveGenerated();
  }
}

world.beforeEvents.itemUseOn.subscribe((event) => {
  const player = event.source;
  const block = event.block;
  const itemStack = event.itemStack;

  if (!block || block.typeId !== RUBBER_LOG_ID) return;

  if (isSword(itemStack) && !getIsCut(block)) {
    setIsCut(block, true);
    return;
  }

  if (!itemStack || itemStack.typeId !== "minecraft:bucket") return;
  if (!getIsCut(block)) return;

  const key = blockKey(block);
  if (regenQueue.has(key)) return;

  if (addLatexToPlayer(player)) {
    regenQueue.set(key, system.currentTick + REGEN_TICKS);
  }
});

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  generateRubberGrove(event.player);
});

system.runInterval(() => {
  const now = system.currentTick;

  for (const [key, dueTick] of regenQueue) {
    if (now < dueTick) continue;

    const [dimensionId, location] = key.split("|");
    const [x, y, z] = location.split(",").map((value) => Number(value));
    const dimension = world.getDimension(dimensionId);
    const block = dimension.getBlock({ x, y, z });

    if (block?.typeId === RUBBER_LOG_ID) {
      try {
        setIsCut(block, false);
      } catch {
        // Ignore unloaded or replaced blocks.
      }
    }

    regenQueue.delete(key);
  }
}, 20);