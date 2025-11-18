const { test, expect } = require('@playwright/test');

// This test expects the local dev server to be running.
// It navigates to /?source=test-slug and prints the final URL and status.
test('embed redirect visit records and redirects', async ({ page }) => {
  const url = process.env.TEST_URL || 'http://localhost:3002/?source=test-slug';
  console.log('Visiting', url);
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  const status = response ? response.status() : null;
  const final = page.url();
  console.log('Response status:', status);
  console.log('Final URL:', final);

  // Basic expectations: server responded and we ended up on a URL that is not the raw source query
  expect(status).not.toBeNull();
  expect(typeof final).toBe('string');
  expect(final.includes('?source=')).toBeFalsy();
});
