import type { Book } from '../types';

interface TagFilterProps {
  books: Book[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

// Modern dark color palette for tags - vibrant and contemporary
const TAG_COLORS = [
  'bg-purple-500/20 text-purple-300 border border-purple-400/30',
  'bg-blue-500/20 text-blue-300 border border-blue-400/30',
  'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
  'bg-pink-500/20 text-pink-300 border border-pink-400/30',
  'bg-amber-500/20 text-amber-300 border border-amber-400/30',
  'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
  'bg-rose-500/20 text-rose-300 border border-rose-400/30',
  'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30',
  'bg-violet-500/20 text-violet-300 border border-violet-400/30',
  'bg-orange-500/20 text-orange-300 border border-orange-400/30',
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
    <div className="mb-0 flex flex-wrap gap-1.5 sm:gap-2">
      {allTags.map(tag => {
        const isSelected = selectedTags.includes(tag);
        const colorClass = getTagColor(tag);
        return (
          <button
            key={tag}
            onClick={() => onTagToggle(tag)}
            className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
              isSelected
                ? colorClass + ' ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/30 scale-105 border-2'
                : colorClass + ' hover:shadow-md hover:scale-105 hover:border-opacity-50'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

