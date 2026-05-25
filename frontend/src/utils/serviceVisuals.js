// Curated, license-safe Unsplash photos used as fallback when an organiser
// hasn't uploaded their own image. Service detail pages now render
// `service.image_url` first; this is only used if that's missing.

const FALLBACK_IMAGES = [
  '/b1.png',
  '/b2.png',
  '/a2.png',
  '/a7.png',
  '/a8.png',
  '/a4.png',
  '/b3.png',
  '/b6.png',
  '/b7.png',
];

const CATEGORY_IMAGES = {
  healthcare: '/a9.png',
  sports:     '/a2.png',
  counseling: '/b3.png',
  events:     '/b6.png',
  interviews: '/b4.png',
  services:   '/b7.png',
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
