import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { visiblePages } from '../src/lib/visible-pages.ts';

// A phone fits three page buttons, so the pager shows a window of three.
describe('pager page numbers', () => {
  it('starts at 1 2 3', () => {
    assert.deepEqual(visiblePages(1, 10), [1, 2, 3]);
    assert.deepEqual(visiblePages(2, 10), [1, 2, 3]);
  });

  it('centres on a middle page', () => {
    assert.deepEqual(visiblePages(5, 10), [4, 5, 6]);
  });

  it('ends on the last three', () => {
    assert.deepEqual(visiblePages(9, 10), [8, 9, 10]);
    assert.deepEqual(visiblePages(10, 10), [8, 9, 10]);
  });

  it('shows every page when there are three or fewer', () => {
    assert.deepEqual(visiblePages(1, 3), [1, 2, 3]);
    assert.deepEqual(visiblePages(2, 2), [1, 2]);
    assert.deepEqual(visiblePages(1, 1), [1]);
  });

  it('stays in range for a page past the end', () => {
    assert.deepEqual(visiblePages(20, 10), [8, 9, 10]);
  });
});
