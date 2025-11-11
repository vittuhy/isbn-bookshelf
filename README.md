# ISBN Database - Personal Book Library

A lightweight web app to catalog your personal books. Add books by ISBN, search your library, and manage your collection. All data is stored locally in your browser.

## Features

- 📚 Add books by ISBN (10 or 13 digits)
- 🔍 Search by title, ISBN, or author
- 📖 View books in a responsive grid
- ✏️ Edit book details
- 🗑️ Delete books
- 🖼️ Automatic cover images from Open Library and Google Books
- 💾 Online storage with Supabase (syncs across devices) or localStorage fallback

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Supabase (PostgreSQL) with localStorage fallback
- **APIs**: Open Library, Google Books
- **Deployment**: Netlify

## Getting Started

### Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Deploy to Netlify

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Netlify will automatically detect the build settings from `netlify.toml`
4. Your app will be deployed!

## Usage

1. **Add a book**: Enter an ISBN (10 or 13 digits) in the search box and click "Add Book"
2. **Search**: Use the search bar to find books by title, ISBN, or author
3. **Edit**: Click "Edit" on any book card to modify its details
4. **Delete**: Click "Delete" on any book card to remove it from your library

## Data Storage

The app supports **two storage modes**:

### 🚀 Supabase (Recommended - Multi-Device Sync)

✅ **Syncs across all devices** - Access your library from anywhere  
✅ **Online storage** - Data stored in the cloud  
✅ **No data loss** - Survives browser clears and device changes  
✅ **Unlimited books** - No storage limits  

**Setup Required:** See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

### 💾 LocalStorage (Fallback)

If Supabase is not configured, the app automatically falls back to browser localStorage:

✅ **Works immediately** - No setup needed  
✅ **Works after Netlify rebuilds** - Data persists in your browser  
⚠️ **Device-specific** - Won't sync across devices  
⚠️ **Limited storage** - ~5-10MB (typically 100-500 books)  

The app automatically detects if Supabase is configured and uses it when available.

## ISBN Lookup Sources

The app fetches book metadata from:
- **Open Library API** (primary)
- **Google Books API** (fallback)

Both sources are free and don't require API keys.

## Testing

Test ISBN: `9788025626955`
