// Inline SVG art for the 4 trash types (HUD + sorting minigame) and faces.
export const ICON = {
  plastic: (wet) => `<svg viewBox="0 0 64 64"><rect x="24" y="6" width="16" height="7" rx="2" fill="#2e86de"/><path d="M26 13h12v6l6 8v28a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5V27l6-8z" fill="#9fd8f5" stroke="#3a86d4" stroke-width="2.5"/><rect x="20" y="32" width="24" height="12" fill="#e2433a"/><path d="M27 22l-3 5v20" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/></svg>`,
  can: () => `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="12" rx="13" ry="4" fill="#dfe4e8" stroke="#8a949c" stroke-width="2"/><path d="M19 12v40c0 2 6 4 13 4s13-2 13-4V12c0 2-6 4-13 4s-13-2-13-4z" fill="#2f8f46" stroke="#1d5e2d" stroke-width="2.5"/><rect x="19" y="26" width="26" height="12" fill="#f1c40f"/><path d="M24 18v32" stroke="#fff" stroke-width="3" opacity=".5"/></svg>`,
  paper: (wet) => `<svg viewBox="0 0 64 64"><path d="M8 22l24-10 24 10v26L32 58 8 48z" fill="${wet ? '#8d6a48' : '#c49a6c'}" stroke="#7a5232" stroke-width="2.5"/><path d="M8 22l24 10 24-10M32 32v26" stroke="#7a5232" stroke-width="2.5" fill="none"/><path d="M20 17l24 10" stroke="#e8d8b8" stroke-width="5"/>${wet ? '<path d="M18 40q2 6 0 8q-2-2 0-8zM44 38q2 6 0 8q-2-2 0-8z" fill="#6ab0ff"/>' : ''}</svg>`,
  metal: () => `<svg viewBox="0 0 64 64"><path d="M10 44q4-26 26-30" stroke="#7a848f" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="42" cy="40" r="13" fill="#9aa3ab" stroke="#5d6670" stroke-width="2.5"/><circle cx="42" cy="40" r="5" fill="#5d6670"/><g fill="#9aa3ab" stroke="#5d6670" stroke-width="2"><rect x="39" y="22" width="6" height="6"/><rect x="39" y="52" width="6" height="6"/><rect x="24" y="37" width="6" height="6"/><rect x="54" y="37" width="6" height="6"/></g><rect x="12" y="46" width="10" height="5" fill="#a0522d" transform="rotate(-20 17 48)"/></svg>`,
};

// a friendly neighbour face; mood: -2 angry .. 2 delighted
export function faceSVG(mood = 0, { female = true, skin = '#e0a77a', hair = '#2a1d14', hat = false } = {}) {
  const brow = mood <= -1 ? 'M42 62l14 5M86 67l14-5' : mood >= 2 ? 'M42 60q7-6 14 0M86 60q7-6 14 0' : 'M42 63h14M86 63h14';
  const mouth = mood <= -2 ? 'M54 112q17-14 34 0' : mood === -1 ? 'M56 108q15-6 30 0' : mood === 0 ? 'M56 106h30' : mood === 1 ? 'M54 102q17 12 34 0' : 'M50 98q21 26 42 0z';
  const eyes = mood >= 2 ? '<path d="M44 78q6-7 12 0M86 78q6-7 12 0" stroke="#1a1410" stroke-width="4" fill="none"/>' : '<ellipse cx="50" cy="78" rx="5" ry="6" fill="#1a1410"/><ellipse cx="92" cy="78" rx="5" ry="6" fill="#1a1410"/>';
  const blush = mood >= 1 ? '<ellipse cx="40" cy="94" rx="8" ry="5" fill="#f08a7a" opacity=".7"/><ellipse cx="102" cy="94" rx="8" ry="5" fill="#f08a7a" opacity=".7"/>' : '';
  const steam = mood <= -2 ? '<path d="M112 30q6-8 0-16M122 38q6-8 0-16" stroke="#e2433a" stroke-width="4" fill="none" stroke-linecap="round"/>' : '';
  const hairBack = female ? `<path d="M22 76q-6 50 20 58h58q26-8 20-58z" fill="${hair}"/>` : '';
  const hatSvg = hat ? '<path d="M8 52L71 10l63 42z" fill="#e8d39a" stroke="#c8a96a" stroke-width="3"/>' : `<path d="M26 66q0-44 45-44t45 44q-10-22-45-22T26 66z" fill="${hair}"/>`;
  return `<svg viewBox="0 0 142 142">${hairBack}<circle cx="71" cy="80" r="46" fill="${skin}"/>${hatSvg}<path d="${brow}" stroke="#2a1d14" stroke-width="5" stroke-linecap="round" fill="none"/>${eyes}${blush}<path d="${mouth}" stroke="#7a2a1a" stroke-width="5" stroke-linecap="round" fill="${mood >= 2 ? '#7a2a1a' : 'none'}"/>${steam}</svg>`;
}
