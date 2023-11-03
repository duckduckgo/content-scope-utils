/**
 * @param {string} input
 * @return {string}
 */
export function date(input) {
  return new Date(input).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}
