# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: isbn-bookshelf (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

## 2. Create the Database Table

Once your project is ready:

1. Go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste this SQL:

```sql
-- Enable pg_trgm extension for fuzzy search (must be done first)
create extension if not exists pg_trgm;

-- Create the books table
create table public.books (
  id uuid primary key default gen_random_uuid(),
  isbn13 text not null,
  isbn10 text,
  title text not null,
  authors text[],
  publisher text,
  published_year int,
  description text,
  cover_url text,
  source_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create unique index on ISBN-13
create unique index books_isbn13_key on public.books(isbn13);

-- Create index for full-text search on title (using pg_trgm)
create index books_title_trgm on public.books using gin (title gin_trgm_ops);

-- Set up Row Level Security (RLS)
alter table public.books enable row level security;

-- Create policy to allow all operations (for now - you can restrict later)
create policy "Allow all operations" on public.books
  for all
  using (true)
  with check (true);
```

4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

**Note:** If you get an error about `pg_trgm` extension, try this simpler version without fuzzy search:

```sql
-- Create the books table
create table public.books (
  id uuid primary key default gen_random_uuid(),
  isbn13 text not null,
  isbn10 text,
  title text not null,
  authors text[],
  publisher text,
  published_year int,
  description text,
  cover_url text,
  source_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create unique index on ISBN-13
create unique index books_isbn13_key on public.books(isbn13);

-- Create simple index for title search (no extension needed)
create index books_title_idx on public.books(title);

-- Set up Row Level Security (RLS)
alter table public.books enable row level security;

-- Create policy to allow all operations
create policy "Allow all operations" on public.books
  for all
  using (true)
  with check (true);
```

## 3. Get Your API Keys

1. Go to **Settings** → **API** in the left sidebar
2. You'll see:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## 4. Add Environment Variables

### For Local Development:

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Netlify Deployment:

1. Go to your Netlify site dashboard
2. Go to **Site settings** → **Environment variables**
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Redeploy your site

## 5. Add Image URL Column (Optional)

If you want to use the manual image URL feature, add this column to your database:

```sql
alter table public.books add column image_url text;
```

## 6. Add Tags Column

To enable tags for books, add this column to your database:

```sql
alter table public.books add column tags text[];
```

Tags are stored as a comma-separated array. You can add multiple tags to each book.

## 6. Test It

1. Start the dev server: `npm run dev`
2. Try adding a book with ISBN: `9788025626955`
3. Check your Supabase dashboard → **Table Editor** → **books** to see the data

## Notes

- The app will **automatically fall back to localStorage** if Supabase credentials are not configured
- Data will sync across all devices once Supabase is set up
- The anon key is safe to use in the frontend (it's public)
- For production, consider adding authentication later to restrict access

