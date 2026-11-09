import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSuspensionNotice,
  setSuspension,
  withSuspensionMessages,
  rewriteSuspensionBody,
  suspensionMessage,
} from '../src/lib/suspension.ts';

const suspended = { suspended: true, reason: 'Maling impormasyon sa listing' };
const active = { suspended: false, reason: null };

// A suspended user must be told they are suspended and why, not shown a database sentence.
describe('suspension refusals', () => {
  it('names the reason in Tagalog and English', () => {
    const text = suspensionMessage('Maling impormasyon sa listing');
    assert.match(text, /Na-suspend ang iyong account/);
    assert.match(text, /Dahilan: Maling impormasyon sa listing\./);
    assert.match(text, /Your account is suspended/);
    assert.match(text, /Reason: Maling impormasyon sa listing\./);
    assert.ok(isSuspensionNotice(text));
  });

  it('still reads well when no reason was recorded', () => {
    const text = suspensionMessage(null);
    assert.doesNotMatch(text, /Dahilan|Reason/);
    assert.match(text, /Makipag-ugnayan sa LGU/);
  });

  it('rewrites the database sentence for a suspended account', () => {
    const next = rewriteSuspensionBody({ code: 'P0001', message: 'account is suspended' }, suspended);
    assert.ok(next && String(next.message).includes('Dahilan: Maling impormasyon sa listing'));
    assert.equal(next?.code, 'P0001');
  });

  it('rewrites a row-level-security refusal only when the account is suspended', () => {
    const body = { code: '42501', message: 'new row violates row-level security policy for table "croplisting"' };
    assert.ok(rewriteSuspensionBody(body, suspended));
    assert.equal(rewriteSuspensionBody(body, active), null);
  });

  it('leaves other errors alone', () => {
    assert.equal(rewriteSuspensionBody({ code: '23505', message: 'duplicate key value' }, suspended), null);
    assert.equal(rewriteSuspensionBody({ message: 'price changed: 18.83' }, suspended), null);
    assert.equal(rewriteSuspensionBody(null, suspended), null);
    assert.equal(rewriteSuspensionBody('oops', suspended), null);
  });

  it('does not rewrite a message that is already friendly', () => {
    const friendly = suspensionMessage('x');
    assert.equal(rewriteSuspensionBody({ message: friendly }, suspended), null);
  });
});

// The wrapper sits under every supabase call, so it must not disturb anything else.
describe('the fetch wrapper', () => {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'content-length': '999' } });

  it('puts the reason in a suspension refusal and keeps the status', async () => {
    setSuspension(true, 'Prueba lang');
    const wrapped = withSuspensionMessages(async () => json({ code: 'P0001', message: 'account is suspended' }, 400));
    const res = await wrapped('https://x/rpc/record_payment');
    const body = (await res.json()) as { message: string; code: string };
    assert.equal(res.status, 400);
    assert.equal(body.code, 'P0001');
    assert.match(body.message, /Dahilan: Prueba lang/);
  });

  it('rewrites a row-level-security refusal only while suspended', async () => {
    const rls = { code: '42501', message: 'new row violates row-level security policy for table "croplisting"' };
    setSuspension(true, 'Prueba lang');
    const on = withSuspensionMessages(async () => json(rls, 403));
    assert.match(((await (await on('https://x')).json()) as { message: string }).message, /Na-suspend ang iyong account/);
    setSuspension(false, null);
    const off = withSuspensionMessages(async () => json(rls, 403));
    assert.match(((await (await off('https://x')).json()) as { message: string }).message, /row-level security/);
  });

  it('passes successful and non-JSON responses through untouched', async () => {
    setSuspension(true, 'x');
    const ok = new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } });
    assert.equal(await withSuspensionMessages(async () => ok)('https://x'), ok);
    const html = new Response('<p>bad gateway</p>', { status: 502, headers: { 'content-type': 'text/html' } });
    assert.equal(await withSuspensionMessages(async () => html)('https://x'), html);
  });

  it('keeps an unreadable error body as it was', async () => {
    setSuspension(true, 'x');
    const broken = new Response('not json', { status: 400, headers: { 'content-type': 'application/json' } });
    assert.equal(await withSuspensionMessages(async () => broken)('https://x'), broken);
  });
});

