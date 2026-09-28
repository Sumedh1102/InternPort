/**
 * Request time for Server Components. These pages are rendered per request (they read
 * the session cookie), so "now" is a request input, not render-time impurity.
 */
export function requestTime(): number {
  return Date.now();
}
