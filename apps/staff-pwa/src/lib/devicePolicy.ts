export function parseAllowedSectorIds(value: string | null | undefined): number[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    }
  } catch {
    // Fall through to comma-separated parsing for operator-entered values.
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function getAllowedSectorIds(): number[] {
  if (typeof window === 'undefined') return [];
  return parseAllowedSectorIds(localStorage.getItem('flux_allowed_sector_ids'));
}

export function saveAllowedSectorInput(value: string) {
  if (typeof window === 'undefined') return;
  const sectorIds = parseAllowedSectorIds(value);
  localStorage.setItem('flux_allowed_sector_ids', JSON.stringify(sectorIds));
}
