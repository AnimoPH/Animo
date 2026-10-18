import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  requestInbox,
  resetNotificationRoute,
  splashFinished,
} from '../src/lib/notification-route.ts';

// A notification tap on a cold start must not open the inbox while the splash
// is still showing, and the same tap must not open it twice.
describe('notification tap routing', () => {
  beforeEach(() => resetNotificationRoute());

  it('waits for the splash, then opens the inbox once', () => {
    let opened = 0;
    requestInbox('tap-1', () => (opened += 1));
    assert.equal(opened, 0, 'opened while the splash was still showing');
    splashFinished();
    assert.equal(opened, 1);
  });

  it('opens the inbox straight away once the splash is done', () => {
    let opened = 0;
    splashFinished();
    requestInbox('tap-2', () => (opened += 1));
    assert.equal(opened, 1);
  });

  it('counts the same tap seen by two listeners once', () => {
    let opened = 0;
    requestInbox('tap-3', () => (opened += 1));
    requestInbox('tap-3', () => (opened += 1));
    splashFinished();
    assert.equal(opened, 1);
  });

  it('opens nothing when no notification was tapped', () => {
    let opened = 0;
    splashFinished();
    assert.equal(opened, 0);
  });

  it('opens a later tap on its own', () => {
    let opened = 0;
    splashFinished();
    requestInbox('tap-4', () => (opened += 1));
    requestInbox('tap-5', () => (opened += 1));
    assert.equal(opened, 2);
  });
});
