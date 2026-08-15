/**
 * SkinManager - Asset visual theme engine.
 *
 * Manages SVG-based skins for hardware types rendered on the Konva canvas.
 * Each skin defines an SVG icon per asset type. Icons are pre-loaded as
 * Image objects and cached for instant Konva.Image rendering.
 *
 * Bounding Box Rule: All icons are designed within a 40×40px boundary
 * so that swapping skins never breaks asset positions on the map.
 */

/** @type {number} Standardized asset bounding box (pixels). */
export const BOUNDING_BOX = 40;

/**
 * SVG definitions for the default corporate skin.
 * Gray/blue tones matching OCS Inventory's visual language.
 */
const THEME_VISIO = {
  server: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect x="4" y="2" width="32" height="36" rx="3" fill="#4a5568" stroke="#2d3748" stroke-width="1.5"/>
    <rect x="7" y="5" width="26" height="9" rx="1.5" fill="#5a6a7e"/>
    <circle cx="28" cy="9.5" r="2" fill="#48bb78"/>
    <rect x="9" y="7.5" width="10" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="9" y="10.5" width="7" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="7" y="16" width="26" height="9" rx="1.5" fill="#5a6a7e"/>
    <circle cx="28" cy="20.5" r="2" fill="#48bb78"/>
    <rect x="9" y="18.5" width="10" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="9" y="21.5" width="7" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="7" y="27" width="26" height="9" rx="1.5" fill="#5a6a7e"/>
    <circle cx="28" cy="31.5" r="2" fill="#48bb78"/>
    <rect x="9" y="29.5" width="10" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="9" y="32.5" width="7" height="1.5" rx=".75" fill="#a0aec0"/>
  </svg>`,

  desktop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect x="4" y="3" width="32" height="22" rx="2" fill="#5a6a7e" stroke="#3d4f5f" stroke-width="1.5"/>
    <rect x="7" y="6" width="26" height="16" rx="1" fill="#a8c4d8"/>
    <rect x="16" y="25" width="8" height="5" fill="#5a6a7e"/>
    <rect x="11" y="30" width="18" height="3" rx="1.5" fill="#4a5568"/>
    <circle cx="20" cy="35" r="1" fill="#a0aec0"/>
  </svg>`,

  printer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect x="8" y="3" width="24" height="8" rx="1.5" fill="#e2e8f0" stroke="#a0aec0" stroke-width="1"/>
    <rect x="4" y="11" width="32" height="16" rx="2.5" fill="#5a6a7e" stroke="#3d4f5f" stroke-width="1.5"/>
    <rect x="8" y="27" width="24" height="9" rx="1.5" fill="#e2e8f0" stroke="#a0aec0" stroke-width="1"/>
    <circle cx="30" cy="19" r="2" fill="#48bb78"/>
    <rect x="10" y="15" width="14" height="1.5" rx=".75" fill="#a0aec0"/>
    <rect x="10" y="30" width="20" height="1" fill="#cbd5e0"/>
    <rect x="10" y="32" width="16" height="1" fill="#cbd5e0"/>
  </svg>`,

  switch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect x="2" y="10" width="36" height="20" rx="2.5" fill="#4a5568" stroke="#2d3748" stroke-width="1.5"/>
    <rect x="5" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <rect x="10" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <rect x="15" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <rect x="20" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <rect x="25" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <rect x="30" y="14" width="4" height="6" rx="1" fill="#a8c4d8"/>
    <circle cx="7" cy="25" r="1.5" fill="#48bb78"/>
    <circle cx="12" cy="25" r="1.5" fill="#48bb78"/>
    <circle cx="17" cy="25" r="1.5" fill="#48bb78"/>
    <circle cx="22" cy="25" r="1.5" fill="#f6ad55"/>
    <circle cx="27" cy="25" r="1.5" fill="#a0aec0"/>
    <circle cx="32" cy="25" r="1.5" fill="#a0aec0"/>
  </svg>`,
};

/** Registry of all available skins. */
const SKINS = {
  theme_visio: THEME_VISIO,
};

export class SkinManager {
  constructor() {
    /** @type {string} */
    this.activeSkin = 'theme_visio';

    /** @type {Map<string, HTMLImageElement>} */
    this.imageCache = new Map();
  }

  /**
   * Pre-loads all SVG icons for the given skin into Image objects.
   * Must be awaited before rendering assets on the canvas.
   *
   * @param {string} [skinName='theme_visio']
   * @returns {Promise<void>}
   */
  async load(skinName = 'theme_visio') {
    this.activeSkin = skinName;
    const skin = SKINS[skinName];

    if (!skin) {
      throw new Error(`[floorplan:skins] Unknown skin: ${skinName}`);
    }

    const entries = Object.entries(skin);
    await Promise.all(
      entries.map(
        ([type, svgMarkup]) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              this.imageCache.set(type, img);
              resolve();
            };
            img.onerror = reject;
            img.src =
              'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgMarkup)));
          }),
      ),
    );
  }

  /**
   * Returns the cached Image for a given asset type.
   * Falls back to 'desktop' if the type is unknown.
   *
   * @param {string} type - Asset type (server, desktop, printer, switch).
   * @returns {HTMLImageElement}
   */
  getImage(type) {
    return this.imageCache.get(type) || this.imageCache.get('desktop');
  }

  /**
   * Returns the list of available skin names.
   * @returns {string[]}
   */
  static available() {
    return Object.keys(SKINS);
  }
}

export const skinManager = new SkinManager();
