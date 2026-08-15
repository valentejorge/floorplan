/**
 * floorplan - API Interceptor
 *
 * Em modo de desenvolvimento (Vite dev server), intercepta chamadas fetch
 * para os endpoints PHP do OCS e redireciona para mocks JSON em /public/ajax/.
 *
 * Em produção (dentro do OCS), usa as rotas reais do backend PHP.
 */

const isDev = import.meta.env.DEV;

/**
 * Mapeamento de rotas PHP para mocks JSON locais.
 * Chave: path relativo do endpoint real (ex: 'ajax/get_map.php')
 * Valor: path do mock JSON em public/ (ex: '/ajax/get_map_1.json')
 */
const MOCK_ROUTES = {
  'ajax/get_map.php?id=1': '/ajax/get_map_1.json',
};

/**
 * Resolve a URL de acordo com o ambiente.
 *
 * @param {string} endpoint - Caminho relativo do endpoint (ex: 'ajax/get_map.php?id=1')
 * @returns {string} URL final resolvida
 */
function resolveUrl(endpoint) {
  if (isDev && MOCK_ROUTES[endpoint]) {
    console.info(`[floorplan:api] DEV mock → ${MOCK_ROUTES[endpoint]}`);
    return MOCK_ROUTES[endpoint];
  }
  // Em produção, o plugin vive dentro do OCS: /ocsreports/extensions/floorplan/
  return endpoint;
}

/**
 * Wrapper de fetch com interceptação de ambiente.
 *
 * @param {string} endpoint - Caminho relativo do endpoint
 * @param {RequestInit} [options={}] - Opções do fetch (method, body, headers, etc.)
 * @returns {Promise<any>} Dados parseados como JSON
 */
export async function api(endpoint, options = {}) {
  const url = resolveUrl(endpoint);

  const defaults = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaults,
    ...options,
    headers: {
      ...defaults.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new Error(`[floorplan:api] HTTP ${response.status} → ${url}`);
  }

  return response.json();
}

export default api;
