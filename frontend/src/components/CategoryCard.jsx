import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

// Inline SVGs — kept self-contained so each card ships its own graphic.
const SVG = {
  heart: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9V3h12v6"/>
      <path d="M18 9a4 4 0 0 0 4-4h-4M6 9a4 4 0 0 1-4-4h4"/>
      <path d="M12 15a6 6 0 0 0 6-6V3H6v6a6 6 0 0 0 6 6Z"/>
      <path d="M9 21h6M12 17v4"/>
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8a2.83 2.83 0 1 1-4-4l8-8z"/>
      <path d="M8.5 12 3 17.5"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7"  width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      <path d="M2 13h20"/>
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2"/>
      <path d="m22 8-6 4 6 4V8Z"/>
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/>
      <path d="M19 14v4M17 16h4M5 5v3M3.5 6.5h3"/>
    </svg>
  ),
};

const ANIM_CLASS = {
  pulse:  'cat-icon-pulse',
  bounce: 'cat-icon-bounce',
  float:  'cat-icon-float',
  glow:   'cat-icon-glow',
  wrench: 'cat-icon-wrench',
};

export default function CategoryCard({ category }) {
  const icon = SVG[category.iconKey] || SVG.sparkles;

  return (
    <Link
      to={category.route}
      className="cat-card border border-ink-200 bg-white group"
      aria-label={`Browse ${category.title} services`}
    >
      {/* Photo at the top — natural framing, no heavy color wash */}
      {category.image && (
        <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.06]"
            style={{ backgroundImage: `url(${category.image})` }}
          />
          {/* Light wash so the floating chip stays readable; intentionally minimal */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 via-transparent to-transparent" />
          <div className="cat-shine" />
          <div
            className={`cat-icon ${ANIM_CLASS[category.animation] || ''} absolute top-4 left-4 p-2.5 rounded-2xl bg-white/95 backdrop-blur shadow-soft`}
            style={{ color: category.accent }}
          >
            {icon}
          </div>
        </div>
      )}

      {/* Editorial content panel */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-3 bg-white">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg sm:text-xl font-semibold text-ink-900 tracking-crisp">
            {category.title}
          </h3>
          <ArrowUpRight size={18} className="text-ink-400 group-hover:text-ink-900 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
        </div>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-2">{category.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-400 mt-1">
          Explore category
          <span className="inline-block w-6 h-px bg-ink-300 group-hover:w-10 group-hover:bg-ink-900 transition-all" />
        </div>
      </div>
    </Link>
  );
}
