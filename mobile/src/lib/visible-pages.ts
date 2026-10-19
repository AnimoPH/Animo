/** The page numbers to show in the pager: at most `size`, centred on the current page. */
export function visiblePages(current: number, total: number, size = 3): number[] {
  const count = Math.max(0, Math.min(size, total));
  const start = Math.max(1, Math.min(current - Math.floor(count / 2), total - count + 1));
  return Array.from({ length: count }, (_, i) => start + i);
}
