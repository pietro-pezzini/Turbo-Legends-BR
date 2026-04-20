import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";

const RUBBER_LOG_ID = "turbo_legends_br:rubber_log";
const LATEX_ITEM_ID = "turbo_legends_br:latex";
const CUT_STATE_KEY = "turbo_legends_br:is_cut";
const REGEN_TICKS = 20 * 60 * 10;
const regenQueue = new Map();

function blockKey(block) {
  return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`;
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

system.runInterval(() => {
  const now = system.currentTick;

  for (const [key, dueTick] of regenQueue) {
    if (now < dueTick) continue;

    const [dimensionId, location] = key.split(":");
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

world.afterEvents.worldInitialize.subscribe((event) => {
  event.blockComponentRegistry.registerCustomComponent("turbo_legends_br:rubber_log_component", {
    onPlayerDestroy: () => {
      // Placeholder hook for future drop logic.
    }
  });
});