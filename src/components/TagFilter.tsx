import type { Book } from '../types';

interface TagFilterProps {
  books: Book[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

// Modern color palette for tags - sophisticated and contemporary
const TAG_COLORS = [
  'bg-slate-100 text-slate-700 border border-slate-300',
  'bg-blue-50 text-blue-700 border border-blue-200',
  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'bg-purple-50 text-purple-700 border border-purple-200',
  'bg-pink-50 text-pink-700 border border-pink-200',
  'bg-amber-50 text-amber-700 border border-amber-200',
  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'bg-rose-50 text-rose-700 border border-rose-200',
  'bg-cyan-50 text-cyan-700 border border-cyan-200',
  'bg-violet-50 text-violet-700 border border-violet-200',
];

function getTagColor(tag: string): string {
  // Use hash of tag to consistently assign colors
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

export function TagFilter({ books, selectedTags, onTagToggle }: TagFilterProps) {
  // Extract all unique tags from books
  const allTags = Array.from(
    new Set(
      books
        .flatMap(book => book.tags || [])
        .filter(Boolean)
    )
  ).sort();

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {allTags.map(tag => {
        const isSelected = selectedTags.includes(tag);
        const colorClass = getTagColor(tag);
        return (
          <button
            key={tag}
            onClick={() => onTagToggle(tag)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isSelected
                ? colorClass + ' ring-2 ring-offset-2 ring-slate-400 shadow-md scale-105'
                : colorClass + ' hover:shadow-md hover:scale-105'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

