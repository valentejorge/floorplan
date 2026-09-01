/**
 * Modular SkinManager - Parametric Asset visual theme engine.
 * Flat & Modern Design Style (Visio-like).
 */

export const SVG_ARCH = {
  door: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><path d="M5,5 L5,55 L55,55 A50,50 0 0,0 5,5" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" stroke-width="2"/><line x1="5" y1="5" x2="5" y2="55" stroke="#1e293b" stroke-width="4"/><line x1="5" y1="55" x2="55" y2="55" stroke="#1e293b" stroke-width="4"/></svg>`,
  window: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="10" viewBox="0 0 80 10"><rect width="80" height="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/><rect x="0" y="3" width="80" height="4" fill="#38bdf8" opacity="0.4"/><line x1="40" y1="0" x2="40" y2="10" stroke="#94a3b8" stroke-width="1"/></svg>`
};

export const SVG_TABLES = {
  desk_small: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="10" y="10" width="100" height="60" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/></svg>`,
  desk_straight: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="10" y="10" width="140" height="60" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/></svg>`,
  desk_l: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><path d="M0,6C0,2.7,2.7,0,6,0H154C157.3,0,160,2.7,160,6V80C160,83.3,157.3,86,154,86H86V154C86,157.3,83.3,160,80,160H6C2.7,160,0,157.3,0,154V6Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><path d="M10,16H144V76H76V144H10V16Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/></svg>`,
  desk_round: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="58" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><circle cx="60" cy="60" r="45" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/><circle cx="60" cy="60" r="10" fill="#e2e8f0"/></svg>`,
  meeting_table: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100" viewBox="0 0 240 100"><rect width="240" height="100" rx="50" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="10" y="10" width="220" height="80" rx="40" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/><line x1="80" y1="50" x2="160" y2="50" stroke="#e2e8f0" stroke-width="2"/></svg>`,
  rack_cabinet: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2"/><rect x="10" y="10" width="60" height="60" rx="2" fill="#334155"/><line x1="20" y1="20" x2="60" y2="20" stroke="#475569" stroke-width="4"/><line x1="20" y1="40" x2="60" y2="40" stroke="#475569" stroke-width="4"/><line x1="20" y1="60" x2="60" y2="60" stroke="#475569" stroke-width="4"/><circle cx="65" cy="15" r="2" fill="#10b981"/><circle cx="65" cy="35" r="2" fill="#10b981"/><circle cx="65" cy="55" r="2" fill="#10b981"/></svg>`,
  sofa: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60"><rect width="120" height="60" rx="10" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/><rect x="10" y="10" width="100" height="40" rx="4" fill="#f8fafc"/><rect x="15" y="15" width="42" height="30" rx="4" fill="#e2e8f0"/><rect x="63" y="15" width="42" height="30" rx="4" fill="#e2e8f0"/></svg>`,
  plant: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/><path d="M25,25 Q15,5 25,0 Q35,5 25,25 Z" fill="#10b981" opacity="0.8" transform="rotate(0 25 25)"/><path d="M25,25 Q15,5 25,0 Q35,5 25,25 Z" fill="#059669" opacity="0.8" transform="rotate(72 25 25)"/><path d="M25,25 Q15,5 25,0 Q35,5 25,25 Z" fill="#34d399" opacity="0.8" transform="rotate(144 25 25)"/><path d="M25,25 Q15,5 25,0 Q35,5 25,25 Z" fill="#10b981" opacity="0.8" transform="rotate(216 25 25)"/><path d="M25,25 Q15,5 25,0 Q35,5 25,25 Z" fill="#059669" opacity="0.8" transform="rotate(288 25 25)"/><circle cx="25" cy="25" r="4" fill="#065f46"/></svg>`,
  ac_unit: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="120" viewBox="0 0 50 120"><rect width="50" height="120" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><rect x="10" y="15" width="30" height="90" rx="2" fill="#e2e8f0"/><line x1="15" y1="25" x2="35" y2="25" stroke="#94a3b8" stroke-width="2"/><line x1="15" y1="35" x2="35" y2="35" stroke="#94a3b8" stroke-width="2"/></svg>`,
  water_cooler: `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><rect width="50" height="50" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><circle cx="25" cy="25" r="16" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/><circle cx="25" cy="25" r="8" fill="#0ea5e9"/></svg>`,
  office_partition_80: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="12" viewBox="0 0 80 12"><rect width="80" height="12" rx="4" fill="#64748b" stroke="#334155" stroke-width="1"/><rect x="2" y="3" width="76" height="6" rx="2" fill="#94a3b8"/></svg>`,
  office_partition_160: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="12" viewBox="0 0 160 12"><rect width="160" height="12" rx="4" fill="#64748b" stroke="#334155" stroke-width="1"/><rect x="2" y="3" width="156" height="6" rx="2" fill="#94a3b8"/></svg>`,
  none: ``
};

export const SVG_CHAIRS = {
  office_chair: `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155" stroke="#1e293b" stroke-width="1"/><rect x="3" y="16" width="6" height="14" rx="3" fill="#64748b"/><rect x="37" y="16" width="6" height="14" rx="3" fill="#64748b"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></svg>`,
  executive_chair: `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 54 54"><rect x="8" y="10" width="38" height="34" rx="10" fill="#0f172a" stroke="#000000" stroke-width="1"/><rect x="3" y="18" width="7" height="18" rx="3.5" fill="#334155"/><rect x="44" y="18" width="7" height="18" rx="3.5" fill="#334155"/><rect x="12" y="2" width="30" height="12" rx="4" fill="#1e293b"/></svg>`,
  meeting_chairs_4: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
    <g transform="translate(67, -10)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(67, 144) rotate(180 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(-10, 67) rotate(270 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(144, 67) rotate(90 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
  </svg>`,
  meeting_chairs_6: `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="140" viewBox="0 0 260 140">
    <!-- Top 3 -->
    <g transform="translate(40, -10)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(107, -10)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(174, -10)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <!-- Bottom 3 -->
    <g transform="translate(40, 104) rotate(180 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(107, 104) rotate(180 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
    <g transform="translate(174, 104) rotate(180 23 23)"><rect x="7" y="10" width="32" height="26" rx="8" fill="#334155"/><rect x="11" y="2" width="24" height="8" rx="4" fill="#475569"/></g>
  </svg>`,
  none: ``
};

export const SVG_DEVICES = {
  desktop_single: `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="36" viewBox="0 0 56 36"><rect x="6" y="2" width="44" height="10" rx="3" fill="#0f172a"/><rect x="25" y="12" width="6" height="6" fill="#334155"/><rect x="20" y="18" width="16" height="4" rx="2" fill="#475569"/><rect x="10" y="24" width="36" height="12" rx="2" fill="#cbd5e1"/><rect x="48" y="25" width="8" height="10" rx="2" fill="#94a3b8"/></svg>`,
  desktop_dual: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="46" viewBox="0 0 100 46">
    <g transform="translate(2, 6) rotate(-12 22 5)"><rect x="0" y="0" width="44" height="10" rx="3" fill="#0f172a"/><rect x="19" y="10" width="6" height="6" fill="#334155"/><rect x="14" y="16" width="16" height="4" rx="2" fill="#475569"/></g>
    <g transform="translate(52, 6) rotate(12 22 5)"><rect x="0" y="0" width="44" height="10" rx="3" fill="#0f172a"/><rect x="19" y="10" width="6" height="6" fill="#334155"/><rect x="14" y="16" width="16" height="4" rx="2" fill="#475569"/></g>
    <rect x="32" y="32" width="36" height="12" rx="2" fill="#cbd5e1"/><rect x="70" y="33" width="8" height="10" rx="2" fill="#94a3b8"/>
  </svg>`,
  laptop: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" viewBox="0 0 48 36"><rect x="0" y="0" width="48" height="24" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1"/><rect x="3" y="3" width="42" height="18" rx="2" fill="#0f172a"/><rect x="0" y="24" width="48" height="12" rx="4" fill="#cbd5e1"/><rect x="18" y="26" width="12" height="6" rx="2" fill="#94a3b8"/></svg>`,
  server_unit: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="26" viewBox="0 0 80 26"><rect width="80" height="26" rx="2" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><circle cx="12" cy="13" r="4" fill="#10b981"/><circle cx="24" cy="13" r="4" fill="#10b981"/><rect x="36" y="8" width="36" height="10" rx="2" fill="#475569"/></svg>`,
  switch_unit: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20" viewBox="0 0 80 20"><rect width="80" height="20" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><circle cx="14" cy="10" r="3" fill="#10b981"/><circle cx="24" cy="10" r="3" fill="#10b981"/><circle cx="34" cy="10" r="3" fill="#10b981"/><circle cx="44" cy="10" r="3" fill="#f59e0b"/><circle cx="54" cy="10" r="3" fill="#94a3b8"/><circle cx="64" cy="10" r="3" fill="#94a3b8"/></svg>`,
  printer_unit: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" viewBox="0 0 48 36"><rect x="6" y="0" width="36" height="12" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><rect x="0" y="12" width="48" height="20" rx="4" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/><rect x="10" y="32" width="28" height="4" fill="#f8fafc"/><rect x="14" y="16" width="8" height="4" rx="1" fill="#3b82f6"/></svg>`,
  monitor_wall: `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="14" viewBox="0 0 70 14"><rect width="70" height="14" rx="4" fill="#0f172a"/><rect x="3" y="10" width="64" height="2" fill="#334155"/></svg>`,
  conference_phone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 22,18 12,22 2,18" fill="#475569" stroke="#334155" stroke-width="1"/><circle cx="12" cy="14" r="4" fill="#1e293b"/><circle cx="12" cy="14" r="2" fill="#3b82f6"/></svg>`,
  none: ``
};

const ALL_SVGS = { ...SVG_ARCH, ...SVG_TABLES, ...SVG_CHAIRS, ...SVG_DEVICES };

export class SkinManager {
  constructor() {
    this.imageCache = new Map();
  }

  async load() {
    const promises = Object.entries(ALL_SVGS).map(([key, svgStr]) => {
      if (!svgStr) return Promise.resolve();
      return new Promise((resolve, reject) => {
        // Extract original width/height
        const wMatch = svgStr.match(/width="(\d+)"/);
        const hMatch = svgStr.match(/height="(\d+)"/);
        
        const origW = wMatch ? parseInt(wMatch[1], 10) : 100;
        const origH = hMatch ? parseInt(hMatch[1], 10) : 100;

        // Create a 4x version for high-DPI rendering
        const scaledStr = svgStr
          .replace(/width="\d+"/, `width="${origW * 4}"`)
          .replace(/height="\d+"/, `height="${origH * 4}"`);

        const img = new Image();
        const svgBlob = new Blob([scaledStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          this.imageCache.set(key, { image: img, width: origW, height: origH });
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.onerror = () => {
          console.error(`Failed to load SVG for: ${key}`);
          URL.revokeObjectURL(url);
          reject(new Error(`SVG load error for ${key}`));
        };
        
        img.src = url;
      });
    });

    await Promise.all(promises);
  }

  getImage(key) {
    return this.imageCache.get(key) || null;
  }
}

export const skinManager = new SkinManager();
