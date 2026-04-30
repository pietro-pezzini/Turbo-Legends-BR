import {
  BlockPermutation,
  DynamicPropertiesDefinition,
  ItemStack,
  system,
  world
} from "@minecraft/server";

const RUBBER_LOG_ID = "turbo_legends_br:rubber_log";
const LATEX_ITEM_ID = "turbo_legends_br:latex";
const CUT_STATE_KEY = "turbo_legends_br:is_cut";
const REGEN_TICKS = 20 * 60 * 10;
const GROVE_CHECK_INTERVAL_TICKS = 20 * 30;
const FLAG_OBJECTIVE_ID = "tlb_flags";
const GROVE_FLAG = "rubber_grove_generated_v1";
const GROVE_X_KEY = "rubber_grove_x";
const GROVE_Y_KEY = "rubber_grove_y";
const GROVE_Z_KEY = "rubber_grove_z";
const REGEN_QUEUE_PROPERTY = "tlb_regen_queue";
const regenQueue = new Map();
const pendingTimers = new Map(); // Track scheduled timers by key
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

function persistRegenQueue() {
  try {
    const data = Array.from(regenQueue.entries());
    world.setDynamicProperty(REGEN_QUEUE_PROPERTY, JSON.stringify(data));
  } catch {
    // Dynamic property not registered or persistence unavailable
  }
}

function restoreRegenQueue() {
  try {
    const data = world.getDynamicProperty(REGEN_QUEUE_PROPERTY);
    if (!data) return;
    const entries = JSON.parse(data);
    regenQueue.clear();
    for (const [key, dueTick] of entries) {
      regenQueue.set(key, dueTick);
    }
  } catch {
    // Failed to restore; queue will reset
  }
}

world.beforeEvents.worldInitialize.subscribe((event) => {
  const definition = new DynamicPropertiesDefinition();
  definition.defineString(REGEN_QUEUE_PROPERTY, 32767);
  event.propertyRegistry.registerWorldDynamicProperties(definition);
});

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

function setGroveAnchor(baseX, baseY, baseZ) {
  const objective = getFlagsObjective();
  objective.setScore(GROVE_X_KEY, baseX);
  objective.setScore(GROVE_Y_KEY, baseY);
  objective.setScore(GROVE_Z_KEY, baseZ);
}

function getGroveAnchor() {
  const objective = getFlagsObjective();

  try {
    const baseX = objective.getScore(GROVE_X_KEY);
    const baseY = objective.getScore(GROVE_Y_KEY);
    const baseZ = objective.getScore(GROVE_Z_KEY);

    if (
      typeof baseX !== "number" ||
      typeof baseY !== "number" ||
      typeof baseZ !== "number"
    ) {
      return null;
    }

    return { baseX, baseY, baseZ };
  } catch {
    return null;
  }
}

function getTreeOriginsFromAnchor(anchor) {
  return [
    { x: anchor.baseX, y: anchor.baseY, z: anchor.baseZ },
    { x: anchor.baseX + 6, y: anchor.baseY, z: anchor.baseZ - 2 }
  ];
}

function hasRubberLogAt(dimension, origin) {
  const block = dimension.getBlock(origin);
  return block?.typeId === RUBBER_LOG_ID;
}

function canReplaceBlock(block, targetTypeId) {
  if (!block) return false;
  if (block.typeId === targetTypeId) return true;
  return REPLACEABLE_BLOCKS.has(block.typeId);
}

function isValidY(dimension, y) {
  // Validate Y is within dimension height range
  return y >= dimension.heightRange.min && y <= dimension.heightRange.max;
}

function placeBlock(dimension, x, y, z, typeId) {
  // Validate height before attempting to place
  if (!isValidY(dimension, y)) return false;

  try {
    const block = dimension.getBlock({ x, y, z });
    if (!canReplaceBlock(block, typeId)) return false;
    block.setPermutation(BlockPermutation.resolve(typeId));
    return true;
  } catch {
    // Out-of-range, unloaded chunk, or other error
    return false;
  }
}

function generateRubberTree(dimension, origin) {
  const { x, y, z } = origin;
  
  // Clamp Y to valid range for this dimension
  const clampedY = Math.max(dimension.heightRange.min, Math.min(y, dimension.heightRange.max - 5));
  
  const trunkPositions = [];
  const leafPositions = [];

  for (let dy = 0; dy < 4; dy += 1) {
    trunkPositions.push([x, clampedY + dy, z]);
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
    try {
      const block = dimension.getBlock({ x: lx, y: ly, z: lz });
      if (!canReplaceBlock(block, RUBBER_LOG_ID)) return false;
    } catch {
      return false;
    }
  }

  for (const [dx, dy, dz] of leafOffsets) {
    leafPositions.push([x + dx, clampedY + dy, z + dz]);
  }

  for (const [lx, ly, lz] of leafPositions) {
    try {
      const block = dimension.getBlock({ x: lx, y: ly, z: lz });
      if (!canReplaceBlock(block, "minecraft:oak_leaves")) return false;
    } catch {
      return false;
    }
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
    setGroveAnchor(baseX, baseY, baseZ);
    markGroveGenerated();
  }
}

function maintainRubberGrove() {
  if (!isGroveGenerated()) return;

  const anchor = getGroveAnchor();
  if (!anchor) return;

  const overworld = world.getDimension("minecraft:overworld");
  const treeOrigins = getTreeOriginsFromAnchor(anchor);

  for (const origin of treeOrigins) {
    if (hasRubberLogAt(overworld, origin)) continue;
    generateRubberTree(overworld, origin);
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
    const dueTick = system.currentTick + REGEN_TICKS;
    regenQueue.set(key, dueTick);
    
    // Schedule individual timer for this entry to reduce scanning overhead
    if (pendingTimers.has(key)) {
      system.clearRun(pendingTimers.get(key));
    }
    const timerId = system.runTimeout(() => {
      processRegenEntry(key);
    }, Math.max(1, REGEN_TICKS));
    pendingTimers.set(key, timerId);
    
    persistRegenQueue();
  }
});

function processRegenEntry(key) {
  try {
    const [dimensionId, location] = key.split("|");
    const [x, y, z] = location.split(",").map((value) => Number(value));
    const dimension = world.getDimension(dimensionId);
    const block = dimension.getBlock({ x, y, z });

    if (block?.typeId === RUBBER_LOG_ID) {
      try {
        setIsCut(block, false);
      } catch {
        // Ignore unloaded or replaced blocks
      }
    }
  } catch {
    // Dimension not found or other error
  }

  regenQueue.delete(key);
  pendingTimers.delete(key);
  persistRegenQueue();
}

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  if (event.player.dimension.id !== "minecraft:overworld") return;
  generateRubberGrove(event.player);
});

// Restore regen queue on world load and reschedule timers
system.runTimeout(() => {
  restoreRegenQueue();
  
  for (const [key, dueTick] of regenQueue) {
    const remainingTicks = Math.max(1, dueTick - system.currentTick);
    const timerId = system.runTimeout(() => {
      processRegenEntry(key);
    }, remainingTicks);
    pendingTimers.set(key, timerId);
  }
}, 1);

system.runInterval(() => {
  if (system.currentTick % GROVE_CHECK_INTERVAL_TICKS === 0) {
    maintainRubberGrove();
  }
}, 20);