# Supabase Storage Setup for Book Covers

## 1. Create the Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `book-covers`
4. **Public bucket**: ✅ Enable (check this box)
5. Click **Create bucket**

## 2. Create Storage Policies

Go to **Storage** → **Policies** → Select `book-covers` bucket

### Policy 1: Allow Public Uploads

Click **New Policy** → **For full customization**

**Policy name**: `Allow public uploads`

**Allowed operation**: `INSERT`

**Policy definition**:
```sql
true
```

**WITH CHECK expression**:
```sql
true
```

Click **Review** → **Save policy**

### Policy 2: Allow Public Read Access

Click **New Policy** → **For full customization**

**Policy name**: `Allow public read access`

**Allowed operation**: `SELECT`

**Policy definition**:
```sql
true
```

Click **Review** → **Save policy**

### Policy 3: Allow Public Delete (REQUIRED - for image cleanup when books are deleted or images are replaced)

Click **New Policy** → **For full customization**

**Policy name**: `Allow public delete`

**Allowed operation**: `DELETE`

**Policy definition**:
```sql
true
```

Click **Review** → **Save policy**

## Alternative: Using SQL Editor

If you prefer SQL, go to **SQL Editor** and run:

```sql
-- Allow public uploads to book-covers bucket
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'book-covers'
);

-- Allow public read access
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'book-covers'
);

-- Allow public delete (REQUIRED for image cleanup)
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'book-covers'
);
```

## 3. Verify Setup

1. The bucket should be **Public**
2. All three policies should be active
3. Try uploading an image from the app - it should work now!

## Security Notes

- These policies allow **anyone** to upload/read/delete images
- For production, consider:
  - Restricting uploads to authenticated users only
  - Adding file size limits via policies
  - Restricting file types (MIME types) via policies
  - Using signed URLs instead of public bucket


