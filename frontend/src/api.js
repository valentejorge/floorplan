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
    
    const results = [];

    // 1. Search Assets in all simulated rooms
    try {
      const files = [
        { file: 'mock_room_100.json', b: 'Headquarters', f: 'Ground Floor', r: 'Open Office A' },
        { file: 'mock_room_101.json', b: 'Headquarters', f: 'Ground Floor', r: 'Server Room' },
        { file: 'mock_room_102.json', b: 'Headquarters', f: 'Ground Floor', r: 'Reception' },
        { file: 'mock_room_112.json', b: 'Headquarters', f: '1º Andar', r: 'Sala de Reunião Alpha' }
      ];
      
      for (const meta of files) {
        try {
          const roomRes = await fetch(`/ajax/${meta.file}`);
          const roomJson = await roomRes.json();
          const roomId = meta.file.match(/\d+/)[0];
          
          if (!roomJson.data || !roomJson.data.assets) continue;
          
          const assetMatches = roomJson.data.assets.filter(a => {
            const mac = a.mac || `00:1A:2B:3C:4D:${a.hardware_id.toString().substring(0,2)}`;
            const user = a.user || (a.type === 'desktop' ? 'jorge.silva' : 'system');
            const desc = a.description || `Equipamento ${a.type} padrão`;
            
            return a.hardware_name.toLowerCase().includes(q) || 
                   (a.ip && a.ip.toLowerCase().includes(q)) || 
                   mac.toLowerCase().includes(q) ||
                   user.toLowerCase().includes(q) ||
                   desc.toLowerCase().includes(q);
          }).map(a => {
            const mac = a.mac || `00:1A:2B:3C:4D:${a.hardware_id.toString().substring(0,2)}`;
            const user = a.user || (a.type === 'desktop' ? 'jorge.silva' : 'system');
            const desc = a.description || `Equipamento ${a.type} padrão`;
            
            return {
              type: 'asset',
              hardware_id: a.hardware_id,
              asset_id: a.id,
              hardware_name: a.hardware_name,
              ip: a.ip,
              mac: mac,
              user: user,
              description: desc,
              room_id: roomId,
              room_name: meta.r,
              floor_name: meta.f,
              building_name: meta.b
            };
          });
          results.push(...assetMatches);
        } catch(e) {}
      }
    } catch(e) {}

    // 2. Search Rooms in the map tree
    try {
      const treeRes = await fetch('/ajax/mock_map_tree.json');
      const treeJson = await treeRes.json();

      treeJson.buildings.forEach(b => {
        b.floors.forEach(f => {
          f.rooms.forEach(r => {
            if (r.name.toLowerCase().includes(q)) {
              results.push({
                type: 'room',
                room_id: r.id,
                room_name: r.name,
                floor_name: f.name,
                building_name: b.name
              });
            }
          });
        });
      });
    } catch(e) {}
    
    return { status: 'success', data: results };
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
