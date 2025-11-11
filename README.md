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

The app fetches book metadata from multiple sources in order:
1. **Open Library API** (primary)
2. **Google Books API** (fallback)
3. **OpenAI API** (optional fallback - requires API key)

### OpenAI API Configuration (Optional)

If you want to use OpenAI as a fallback when books aren't found in Open Library or Google Books:

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a `.env` file in the project root:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
3. For production (Netlify), add `VITE_OPENAI_API_KEY` as an environment variable in your Netlify site settings

**Note**: The OpenAI fallback only fetches Title, Authors, and Published Year (no description) to minimize costs. It uses the `gpt-4o` model for cost efficiency.

### Google Custom Search API Configuration (Optional - for OpenAI-only mode)

When using the "Použít pouze OpenAI" checkbox, the app will first try Google Custom Search (if configured) before falling back to OpenAI. This provides better results since Google Search has access to live web data.

**Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**
5. Create a **Custom Search Engine**:
   - Go to [Google Custom Search](https://programmablesearchengine.google.com/)
   - Click **Add** to create a new search engine
   - Set **Sites to search** to `*` (search the entire web)
   - Get your **Search Engine ID** (CX)
6. Add to your `.env` file:
   ```
   VITE_GOOGLE_SEARCH_API_KEY=your_google_api_key_here
   VITE_GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```
7. For production (Netlify), add both as environment variables

**Note**: Google Custom Search API has a free tier of 100 queries per day. After that, it costs $5 per 1,000 queries.

## Testing

Test ISBN: `9788025626955`
