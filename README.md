# ISBN Database - Personal Book Library

A lightweight web app to catalog your personal books. Add books by ISBN, search your library, and manage your collection. All data is stored locally in your browser.

## Features

- 📚 Add books by ISBN (10 or 13 digits)
- 🔍 Search by title, ISBN, or author
- 📖 View books in a responsive grid
- ✏️ Edit book details
- 🗑️ Delete books
- 🖼️ Automatic cover images from Open Library and Google Books
- 💾 Data stored in browser localStorage (no database needed)

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage
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

All book data is stored in your browser's localStorage. This means:
- Your data stays on your device
- No account or login required
- Data persists across browser sessions
- Maximum ~100 books recommended (localStorage has size limits)

## ISBN Lookup Sources

The app fetches book metadata from:
- **Open Library API** (primary)
- **Google Books API** (fallback)

Both sources are free and don't require API keys.

## Testing

Test ISBN: `9788025626955`
