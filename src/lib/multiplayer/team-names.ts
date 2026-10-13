/** Display names for the two sides of a room (each ≤ NAME_MAX). */
export const TEAM_NAME_PAIRS: readonly (readonly [string, string])[] = [
  ["Phoenix Rise", "Iron Tide"],
  ["Neon Comets", "Shadow Kits"],
  ["Thunder Pack", "Crystal Hive"],
  ["Solar Flare", "Midnight Owls"],
  ["Volt Kings", "Ember Storm"],
  ["Cosmic Rift", "Wild Aurora"],
  ["Blaze Legion", "Frost Fang"],
  ["Starfall Crew", "Rogue Comet"],
  ["Golden Lynx", "Silver Viper"],
  ["Turbo Titans", "Pixel Phantom"],
  ["Mystic Forge", "Savage Bloom"],
  ["Hyper Nova", "Silent Reef"],
  ["Crimson Hawk", "Azure Wolf"],
  ["Quantum Leap", "Velvet Thunder"],
  ["Jade Dragon", "Onyx Panther"],
  ["Rocket Rebels", "Lunar Guard"],
  ["Prism Pulse", "Obsidian Edge"],
  ["Wildfire Unit", "Glacier Guild"],
  ["Zenith Squad", "Abyssal Spark"],
  ["Copper Foxes", "Platinum Bears"],
  ["Turbo Lynx", "Neon Badgers"],
  ["Storm Chasers", "Sunset Raiders"],
  ["Galaxy Grit", "Forest Fury"],
  ["Spark Monkeys", "Cloud Strikers"],
  ["Ruby Comets", "Sapphire Tide"],
  ["Dynamo Duo", "Whisper Wind"],
  ["Arcane Ace", "Rapid Raptor"],
  ["Blitz Brigade", "Dream Drift"],
  ["Nova Nomads", "Echo Elite"],
  ["Polar Pulse", "Desert Dash"],
  ["Mint Mavericks", "Coral Crushers"],
  ["Orbit Owls", "Meteor Mice"],
  ["Vivid Vortex", "Hollow Hero"],
  ["Kinetic Koi", "Static Stallion"],
  ["Lucky Lemurs", "Bold Bison"],
];

/** Picks a random opposing pair; order is shuffled so either side can get either name. */
export function pickTeamNamePair(random: () => number = Math.random): [string, string] {
  const pair = TEAM_NAME_PAIRS[Math.floor(random() * TEAM_NAME_PAIRS.length)]!;
  return random() < 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]];
}
