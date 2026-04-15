// JSDoc typedefs keep the JavaScript starter lightweight while documenting API contracts.

/**
 * @typedef {Object} RatePoint
 * @property {string} symbol
 * @property {string} timestamp
 * @property {number} close
 */

/**
 * @typedef {Object} ForecastResult
 * @property {string} symbol
 * @property {number} predictedNextClose
 * @property {number} projectedLow
 * @property {number} projectedHigh
 * @property {number} confidence
 * @property {'bullish'|'bearish'|'sideways'} direction
 * @property {string} modelVersion
 */
