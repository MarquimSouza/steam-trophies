export type RarityTier = {
  label: string
  color: string
}

export function getRarityTier(globalPercent: number | null): RarityTier {
  if (globalPercent === null) {
    return { label: "Sem dados", color: "var(--text-secondary)" }
  }
  if (globalPercent < 1) {
    return { label: "Lendária", color: "var(--rarity-legendary)" }
  }
  if (globalPercent < 5) {
    return { label: "Épica", color: "var(--rarity-epic)" }
  }
  if (globalPercent < 15) {
    return { label: "Rara", color: "var(--rarity-rare)" }
  }
  if (globalPercent < 40) {
    return { label: "Incomum", color: "var(--rarity-uncommon)" }
  }
  return { label: "Comum", color: "var(--rarity-common)" }
}