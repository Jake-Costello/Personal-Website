// Count decoded response bytes as they arrive, before retaining the full body.
export async function readBoundedText(
  response: Response,
  maxBytes: number,
  tooLarge = 'The response was too large. Please try again.',
): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error(tooLarge);
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  return JSON.parse(await readBoundedText(response, maxBytes));
}
