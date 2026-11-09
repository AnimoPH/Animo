import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MATURITY_DAYS } from '../supabase/functions/_shared/advisory-rule.ts';

// The rice types and their maturity days are written in four places: the phone
// (advisory-service.ts), the edge function (advisory-rule.ts), the check
// constraint and the SQL function. These tests fail when one of them drifts.
const here = (path: string) => join(dirname(fileURLToPath(import.meta.url)), path);
const read = (path: string) => readFileSync(here(path), 'utf8');
const migrations = readdirSync(here('../supabase/migrations/')).sort();

const lastMigrationWith = (needle: RegExp) => {
  const file = migrations.filter((f) => needle.test(read(`../supabase/migrations/${f}`))).pop();
  assert.ok(file, `no migration matches ${needle}`);
  return read(`../supabase/migrations/${file}`);
};

const keys = (o: Record<string, number>) => Object.keys(o).sort();

describe('rice type categories agree across the app, the edge function and the database', () => {
  const service = read('../src/services/advisory-service.ts');

  it('the phone type, both option lists and the maturity table list the same categories', () => {
    const type = service.match(/export type RiceTypeCategory = ([^;]+);/)![1];
    const fromType = [...type.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
    const optionLists = [...service.matchAll(/RICE_TYPE_OPTIONS_(?:TL|EN)[^=]*= \[([\s\S]*?)\];/g)];
    assert.equal(optionLists.length, 2);
    for (const list of optionLists) {
      const values = [...list[1].matchAll(/value: '(\w+)'/g)].map((m) => m[1]).sort();
      assert.deepEqual(values, fromType);
    }
    const table = service.match(/const MATURITY_DAYS[^{]*\{([\s\S]*?)\};/)![1];
    const days = Object.fromEntries([...table.matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));
    assert.deepEqual(keys(days), fromType);
    assert.deepEqual(days, MATURITY_DAYS);
  });

  it('the latest check constraint allows the same categories', () => {
    const sql = lastMigrationWith(/cropcycle_rice_type_category_check|rice_type_category text check/);
    const list = sql.match(/rice_type_category in \(([^)]*)\)/g)!.pop()!;
    const allowed = [...list.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
    assert.deepEqual(allowed, keys(MATURITY_DAYS));
  });

  it('the latest SQL maturity function gives the same days', () => {
    const sql = lastMigrationWith(/function public\.rice_maturity_days/);
    const body = sql.slice(sql.lastIndexOf('rice_maturity_days'));
    const days = Object.fromEntries([...body.matchAll(/when '(\w+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
    assert.deepEqual(days, MATURITY_DAYS);
  });
});
