export const linkedInUrl = 'https://www.linkedin.com/in/jacob-costello-675913232';

// Only public form IDs belong in the frontend. Email-address endpoints and
// arbitrary URLs are deliberately unsupported.
export function getContactEndpoint(value: string | undefined): string | null {
  const endpoint = value?.trim();
  return endpoint && /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint) ? endpoint : null;
}
