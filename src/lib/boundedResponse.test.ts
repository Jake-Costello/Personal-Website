import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedJson, readBoundedText } from './boundedResponse';

test('oversized streamed responses are canceled before reading the remaining body', async () => {
  let reads = 0;
  let canceled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(4));
        if (reads === 100) controller.close();
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  await assert.rejects(readBoundedText(new Response(body), 10), /too large/);
  assert.equal(reads, 3);
  assert.equal(canceled, true);
});

test('the limit counts UTF-8 bytes rather than JavaScript characters', async () => {
  await assert.rejects(readBoundedText(new Response('éé'), 3), /too large/);
  assert.equal(await readBoundedText(new Response('éé'), 4), 'éé');
});

test('split multibyte characters survive streaming and bounded JSON still parses', async () => {
  const bytes = new TextEncoder().encode('{"name":"é"}');
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  assert.deepEqual(await readBoundedJson(new Response(body), bytes.length), { name: 'é' });
  await assert.rejects(readBoundedJson(new Response('not JSON'), 100), SyntaxError);
});
