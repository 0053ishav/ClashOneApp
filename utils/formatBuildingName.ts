export function normalizeName(name: string) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function truncateName(name: string, maxLength = 25) {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + "…";
}

export function formatBuildingName(name: string, maxLength = 25) {
  return truncateName(normalizeName(name), maxLength);
}
