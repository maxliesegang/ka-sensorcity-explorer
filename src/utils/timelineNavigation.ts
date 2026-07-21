interface TimestampedItem {
  timestamp: number;
}

/** Find the nearest timeline item at least one requested step earlier or later. */
export function findTimelineStepIndex(
  items: readonly TimestampedItem[],
  currentIndex: number,
  stepMinutes: number,
  direction: -1 | 1,
): number {
  const targetTimestamp =
    items[currentIndex].timestamp + direction * stepMinutes * 60_000;
  let low = direction < 0 ? 0 : currentIndex + 1;
  let high = direction < 0 ? currentIndex - 1 : items.length - 1;
  let matchingIndex = direction < 0 ? 0 : items.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (direction < 0) {
      if (items[middle].timestamp <= targetTimestamp) {
        matchingIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    } else if (items[middle].timestamp >= targetTimestamp) {
      matchingIndex = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return matchingIndex;
}
