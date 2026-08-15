/**
 * floorplan - API Interceptor
 *
 * In development mode (Vite dev server), intercepts fetch calls targeting
 * OCS PHP endpoints and redirects them to local JSON mocks in /public/ajax/.
 *
 * In production (within OCS), uses live PHP backend routes.
 */

const isDev = import.meta.env.DEV;

/**
 * Route mapping for PHP endpoints to local static JSON mocks.
 * Key: relative endpoint path (e.g. 'ajax/get_room.php')
 * Value: public mock path (e.g. '/ajax/mock_room_1.json')
 */
const MOCK_ROUTES = {
  'ajax/get_room.php?id=1': '/ajax/mock_room_1.json',
  'ajax/search_asset.php': '/ajax/mock_search.json',
};

/**
 * Resolves the URL based on the current environment.
 *
 * @param {string} endpoint - Relative endpoint path
 * @returns {string} Resolved URL
 */
function resolveUrl(endpoint) {
  if (!isDev) return endpoint;

  // Exact match first
  if (MOCK_ROUTES[endpoint]) {
    console.info(`[floorplan:api] DEV mock → ${MOCK_ROUTES[endpoint]}`);
    return MOCK_ROUTES[endpoint];
  }

  // Prefix match (e.g. 'ajax/search_asset.php?q=SRV' → 'ajax/search_asset.php')
  const base = endpoint.split('?')[0];
  if (MOCK_ROUTES[base]) {
    console.info(`[floorplan:api] DEV mock → ${MOCK_ROUTES[base]}`);
    return MOCK_ROUTES[base];
  }

  return endpoint;
}

/**
 * Fetch wrapper with environment-aware interception.
 *
 * @param {string} endpoint - Relative endpoint path
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function api(endpoint, options = {}) {
  const url = resolveUrl(endpoint);

  const defaults = {
    headers: { 'Content-Type': 'application/json' },
  };

  const config = {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...options.headers },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new Error(`[floorplan:api] HTTP ${response.status} → ${url}`);
  }

  return response.json();
}

export default api;
