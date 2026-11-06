/** Shared formatting and article sentence segmentation helpers. */
  const ICONS = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 5 6 13 0 18M12 3c-6 5-6 13 0 18"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    bookmark: '<path d="M5 3h14v18l-7-5-7 5z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5-8 10"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m4 12 5 5L20 6"/>'
  };
  export const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.check}</svg>`;
  export const esc = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  export const now = () => new Date().toISOString();
  const unique = arr => [...new Set(arr)];

  export function sentenceSegments(text){
    const safe=String(text).replace(/\bU\.S\./g,'U§S§').replace(/\bU\.K\./g,'U§K§');
    let parts=[];
    if(typeof Intl.Segmenter==='function') parts=Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(safe),x=>x.segment);
    else parts=safe.match(/[^.!?]+[.!?]*\s*|[^.!?]+$/g)||[safe];
    return parts.map(p=>p.replace(/U§S§/g,'U.S.').replace(/U§K§/g,'U.K.').trim()).filter(Boolean);
  }
