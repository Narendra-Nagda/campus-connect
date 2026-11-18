import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.ts';

test('hashPassword and verifyPassword verify valid credentials and reject wrong ones', () => {
  const hash = hashPassword('campus123');
  assert.notEqual(hash, 'campus123');
  assert.equal(verifyPassword('campus123', hash), true);
  assert.equal(verifyPassword('wrongpass', hash), false);
  assert.equal(verifyPassword('campus123', 'malformed'), false);
});

test('signToken and verifyToken authenticate valid tokens and reject tampered or expired tokens', () => {
  const token = signToken({ sub: 'user-1', role: 'faculty' }, 3600);
  const verified = verifyToken(token);
  assert.ok(verified);
  assert.equal(verified.sub, 'user-1');
  assert.equal(verified.role, 'faculty');

  const tampered = `${token.slice(0, -4)}xxxx`;
  assert.equal(verifyToken(tampered), null);

  const expired = signToken({ sub: 'user-1', role: 'student' }, -10);
  assert.equal(verifyToken(expired), null);
});
