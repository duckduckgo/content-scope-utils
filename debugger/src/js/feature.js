/**
 * Used to provide strong types to individual features
 *
 * @param {object} input
 * @param {() => Promise<any>} input.loader
 * @param {string} input.title
 * @param {number} input.order
 * @returns {import("./types").FeatureLoader}
 */
export function defineFeature(input) {
  return input
}
