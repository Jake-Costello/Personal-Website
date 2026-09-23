import assert from 'node:assert/strict';
import test from 'node:test';
import { getContactEndpoint } from './contact.ts';

test('contact remains off until a public form ID endpoint is configured', () => {
  assert.equal(getContactEndpoint(undefined), null);
  assert.equal(getContactEndpoint(''), null);
  assert.equal(
    getContactEndpoint('  https://formspree.io/f/abc123  '),
    'https://formspree.io/f/abc123',
  );
});

test('contact configuration rejects email endpoints and unexpected destinations', () => {
  for (const endpoint of [
    'mailto:recipient@example.com',
    'https://formspree.io/recipient@example.com',
    'http://formspree.io/f/abc123',
    'https://formspree.io.evil.example/f/abc123',
    'https://formspree.io@evil.example/f/abc123',
    'https://evil.example/f/abc123',
    'https://formspree.io/f/abc123?email=recipient@example.com',
    'javascript:alert(1)',
  ]) {
    assert.equal(getContactEndpoint(endpoint), null);
  }
});
