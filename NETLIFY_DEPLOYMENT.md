# Netlify Deployment Plan for knihy.vtuhy.cz

## Prerequisites
- ✅ Git repository connected to Netlify
- ✅ Netlify account with DNS management access for `vtuhy.cz`
- ✅ Supabase project configured (see `SUPABASE_SETUP.md`)

## Step 1: Prepare Netlify Configuration

The `netlify.toml` file should be configured with:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18.x or higher

## Step 2: Connect Repository to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select the repository: `isbn-bookshelf` (or your repo name)
5. Configure build settings:
   - **Base directory**: (leave empty - repository root is the project root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` (or latest LTS)

**Note**: Since `ISBNDatabase` is a standalone repository (`isbn-bookshelf.git`), the base directory should be left empty. Netlify will use the repository root as the project root.

## Step 3: Configure Secrets Scanning (Important!)

Netlify's secrets scanner will detect Supabase environment variables in the build output. This is **expected and safe** - the Supabase anon key is designed to be public in client-side code.

The `netlify.toml` file is already configured to omit these keys from scanning. If you still see warnings, you can also add this in Netlify Dashboard:

1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Add environment variable: `SECRETS_SCAN_OMIT_KEYS` = `VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY`

## Step 4: Configure Environment Variables

In Netlify Dashboard → Site settings → Environment variables, add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: These are public variables (VITE_ prefix), safe to expose in frontend.

## Step 5: Configure Custom Domain

### 5.1 Add Domain to Netlify Site

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `knihy.vtuhy.cz`
4. Netlify will verify domain ownership

### 5.2 Configure DNS in Netlify

Since DNS is managed via Netlify:

1. Go to **Netlify Dashboard** → **Domain management** (top level, not site-specific)
2. Find your domain `vtuhy.cz`
3. Netlify will automatically create the DNS record when you add the subdomain
4. Verify it appears in your DNS records:
   - **Type**: `CNAME` (for subdomains) or `A` (for apex domains)
   - **Name**: `knihy`
   - **Value**: Netlify will automatically set this to your site's target

**Note about CNAME files:**
- A `CNAME` **file** in your repository is only needed for **GitHub Pages**, not Netlify
- Netlify doesn't require a CNAME file - domain configuration is done through the dashboard
- The DNS **record** (CNAME or A) is created automatically by Netlify when DNS is managed by Netlify
- If you were using external DNS, you'd add the CNAME **DNS record** at your DNS provider, not a file in your repo

### 4.3 SSL Certificate

Netlify automatically provisions SSL certificates via Let's Encrypt:
- Wait 5-10 minutes after DNS configuration
- SSL will be automatically enabled
- Your site will be accessible at `https://knihy.vtuhy.cz`

## Step 6: Verify Build Configuration

Ensure `netlify.toml` contains:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Note**: No base directory is needed since the repository root (`isbn-bookshelf`) is the project root.

This ensures React Router (if used) and SPA routing works correctly.

## Step 7: Test Deployment

1. Push a commit to trigger a build
2. Check build logs in Netlify Dashboard
3. Verify the site loads at `https://knihy.vtuhy.cz`
4. Test adding a book to ensure Supabase connection works

## Step 7: Post-Deployment Checklist

- [ ] Site loads at `https://knihy.vtuhy.cz`
- [ ] SSL certificate is active (green lock icon)
- [ ] Environment variables are set correctly
- [ ] Books can be added (tests Supabase connection)
- [ ] Books persist after page refresh
- [ ] Search functionality works
- [ ] Tag filtering works
- [ ] Edit/Delete functionality works

## Troubleshooting

### DNS Issues
- **Problem**: Subdomain not resolving
- **Solution**: 
  - Wait 24-48 hours for DNS propagation
  - Check DNS records in Netlify Domain management
  - Verify CNAME/A record points to correct Netlify target

### Build Failures
- **Problem**: Build fails with environment variable errors
- **Solution**: 
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
  - Check build logs for specific error messages
  - Ensure Node version is 18+ in Netlify settings

### Supabase Connection Issues
- **Problem**: Books not saving/loading
- **Solution**:
  - Verify environment variables in Netlify match Supabase credentials
  - Check Supabase RLS policies allow public access
  - Review browser console for CORS or API errors

### Routing Issues (404 on refresh)
- **Problem**: Getting 404 when refreshing pages
- **Solution**: 
  - Ensure `netlify.toml` has the redirect rule (see Step 5)
  - Redeploy after adding redirect rule

## Additional Configuration (Optional)

### Branch Deploys
- Configure branch deploys for preview environments
- Go to **Site settings** → **Build & deploy** → **Branch deploys**

### Build Hooks
- Set up build hooks for automated deployments
- Useful for CI/CD integration

### Analytics (Optional)
- Enable Netlify Analytics for site usage statistics

## Notes

- The app will automatically fall back to localStorage if Supabase is not configured
- All environment variables must start with `VITE_` to be accessible in the frontend
- Netlify provides free SSL certificates automatically
- DNS changes can take up to 48 hours to propagate globally

