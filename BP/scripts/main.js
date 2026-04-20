import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";

const RUBBER_LOG_ID = "turbo_legends_br:rubber_log";
const LATEX_ITEM_ID = "turbo_legends_br:latex";
const CUT_STATE_KEY = "turbo_legends_br:is_cut";
const REGEN_TICKS = 20 * 60 * 10;
const regenQueue = new Map();
const generatedSpawns = new Set();

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

function placeBlock(dimension, x, y, z, typeId) {
  const block = dimension.getBlock({ x, y, z });
  if (!block) return;
  block.setPermutation(BlockPermutation.resolve(typeId));
}

function generateRubberTree(dimension, origin) {
  const { x, y, z } = origin;

  for (let dy = 0; dy < 4; dy += 1) {
    placeBlock(dimension, x, y + dy, z, RUBBER_LOG_ID);
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

  for (const [dx, dy, dz] of leafOffsets) {
    placeBlock(dimension, x + dx, y + dy, z + dz, "minecraft:oak_leaves");
  }
}

function generateRubberGrove(player) {
  const dimension = player.dimension;
  const spawnKey = `${dimension.id}:${Math.floor(player.location.x)},${Math.floor(player.location.y)},${Math.floor(player.location.z)}`;

  if (generatedSpawns.has(spawnKey)) return;

  const baseX = Math.floor(player.location.x) + 4;
  const baseY = Math.floor(player.location.y);
  const baseZ = Math.floor(player.location.z) + 4;

  generateRubberTree(dimension, { x: baseX, y: baseY, z: baseZ });
  generateRubberTree(dimension, { x: baseX + 6, y: baseY, z: baseZ - 2 });

  generatedSpawns.add(spawnKey);
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