import type { Book } from '../types';

interface TagFilterProps {
  books: Book[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

// Optimized color palette for tags - high contrast, excellent visibility
const TAG_COLORS = [
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-purple-600 text-white',
  'bg-pink-600 text-white',
  'bg-orange-600 text-white',
  'bg-indigo-600 text-white',
  'bg-red-600 text-white',
  'bg-teal-600 text-white',
  'bg-rose-600 text-white',
  'bg-violet-600 text-white',
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
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              isSelected
                ? colorClass + ' ring-2 ring-offset-2 ring-gray-400 shadow-md'
                : colorClass + ' opacity-70 hover:opacity-100 hover:shadow-md'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

