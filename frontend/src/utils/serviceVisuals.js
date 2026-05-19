// Curated, license-safe Unsplash photos used as fallback when an organiser
// hasn't uploaded their own image. Service detail pages now render
// `service.image_url` first; this is only used if that's missing.

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1562280963-8a5475740a10?w=900&q=80&auto=format&fit=crop',
];

const CATEGORY_IMAGES = {
  healthcare: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
  sports:     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop',
  counseling: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&auto=format&fit=crop',
  events:     'https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=900&q=80&auto=format&fit=crop',
  interviews: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=900&q=80&auto=format&fit=crop',
  services:   'https://images.unsplash.com/photo-1562280963-8a5475740a10?w=900&q=80&auto=format&fit=crop',
};

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
};

export function imageFor(service) {
  if (!service) return FALLBACK_IMAGES[0];
  if (service.image_url) return service.image_url;
  if (service.category_key && CATEGORY_IMAGES[service.category_key]) {
    return CATEGORY_IMAGES[service.category_key];
  }
  const seed = String(service.id || service.name || '');
  return FALLBACK_IMAGES[hash(seed) % FALLBACK_IMAGES.length];
}

export function descriptionFor(service) {
  if (service && service.description && service.description.trim().length > 8) {
    return service.description;
  }
  return 'A trusted appointment experience — book a slot in seconds and we will take care of the rest.';
}
