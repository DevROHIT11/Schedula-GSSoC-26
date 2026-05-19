import CategoryCard from './CategoryCard.jsx';
import { CATEGORIES } from '../data/categories';
import '../styles/category.css';

export default function CategoryGrid({
  heading = 'Explore by category',
  subheading = 'Six verticals, hundreds of providers — pick a corner of life and we\'ll find a slot.',
}) {
  return (
    <section aria-labelledby="cat-grid-heading" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h2 id="cat-grid-heading" className="section-title mt-2">{heading}</h2>
          <p className="section-sub mt-1">{subheading}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} />)}
      </div>
    </section>
  );
}
