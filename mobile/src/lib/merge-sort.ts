/**
 * Explicit merge sort, used instead of `Array.prototype.sort` for the buyer
 * marketplace ranking.
 *
 * Two properties are required there and only one of them is guaranteed by the
 * runtime: stability is mandated by the ES2019 spec, but the worst-case bound
 * is not — engines are free to pick their own algorithm (V8 falls back to
 * insertion sort on short runs, which is O(n^2) in the worst case). Merge sort
 * gives O(n log n) worst case by construction, and its stability is what
 * delivers the "oldest listing first" tiebreak: the caller feeds rows in
 * date_listed order and the comparator only looks at the WPM score, so equal
 * scores keep their incoming (oldest-first) order.
 */
export function mergeSort<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  if (items.length <= 1) return [...items];

  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);

  return merge(left, right, compare);
}

function merge<T>(left: readonly T[], right: readonly T[], compare: (a: T, b: T) => number): T[] {
  const merged: T[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    // `<= 0` (not `< 0`) is the stability guarantee: on a tie the element from
    // the left half — the one that came first in the input — is emitted first.
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      merged.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(right[rightIndex]);
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    merged.push(left[leftIndex]);
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    merged.push(right[rightIndex]);
    rightIndex += 1;
  }

  return merged;
}
