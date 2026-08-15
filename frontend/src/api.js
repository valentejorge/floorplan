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
  // Dynamic mock search interceptor for DEV
  if (isDev && endpoint.startsWith('ajax/search_asset.php')) {
    const urlObj = new URL(endpoint, 'http://localhost');
    const q = (urlObj.searchParams.get('q') || '').toLowerCase();
    
    // Fetch current room to search within it
    const roomRes = await fetch('/ajax/mock_room_1.json');
    const roomJson = await roomRes.json();
    
    const matches = roomJson.data.assets.filter(a => 
      a.hardware_name.toLowerCase().includes(q) || 
      (a.ip && a.ip.toLowerCase().includes(q)) || 
      (a.mac && a.mac.toLowerCase().includes(q))
    ).map(a => ({
      hardware_id: a.hardware_id,
      hardware_name: a.hardware_name,
      ip: a.ip,
      mac: a.mac,
      room_id: 1,
      room_name: "Server Room A",
      floor_name: "Ground Floor",
      building_name: "Headquarters",
      pos_x: a.pos_x,
      pos_y: a.pos_y
    }));
    
    return { status: 'success', data: matches };
  }

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
