const STAT_LABELS: Record<string, string> = {
    hp: "Hitpoints",
    dps: "Damage per second",
    dph: "Damage per hit",

    heroDps: "Hero damage per second",
    heroDph: "Hero damage per hit",

    range: "Range",
    attackSpeed: "Attack speed",
    cooldown: "Cooldown",
    burstShots: "Burst shots",
    projectiles: "Projectiles",
    targets: "Targets",

    explosionDamage: "Explosion damage",
    splashRadius: "Splash radius",
    chainTargets: "Chain targets",
    chainRange: "Chain range",

    duration: "Duration",
    baseDuration: "Base duration",
    firstDecay: "First decay",
    secondDecay: "Second decay",

    poisonLevel: "Poison level",
    freezeDuration: "Freeze duration",
    slowPercent: "Slow",
    slowDuration: "Slow duration",
    burnDps: "Burn damage per second",
    stunDuration: "Stun duration",

    capacity: "Capacity",
    production: "Production",
    lootBonus: "Loot bonus",
    trainingSpeed: "Training speed",

    armor: "Armor",
    shield: "Shield",
    reflectDamage: "Reflect damage",
    damageReduction: "Damage reduction",

    speed: "Speed",
    jumpDistance: "Jump distance",
    dashDistance: "Dash distance",

    heal: "Healing",
    healPerSecond: "Healing per second",
    healRadius: "Healing radius",

    spawnCount: "Spawn count",
    spawnLevel: "Spawn level",
    lifetime: "Lifetime",
};

export function formatStatName(stat: string): string {
    if (STAT_LABELS[stat]) {
        return STAT_LABELS[stat];
    }

    // Safe fallback for future keys.
    return stat
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}