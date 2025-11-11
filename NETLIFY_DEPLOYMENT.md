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
4. Select the repository: `ISBNDatabase` (or your repo name)
5. Configure build settings:
   - **Base directory**: (leave empty or set to root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` (or latest LTS)

## Step 3: Configure Environment Variables

In Netlify Dashboard → Site settings → Environment variables, add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: These are public variables (VITE_ prefix), safe to expose in frontend.

## Step 4: Configure Custom Domain

### 4.1 Add Domain to Netlify Site

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `knihy.vtuhy.cz`
4. Netlify will verify domain ownership

### 4.2 Configure DNS in Netlify

Since DNS is managed via Netlify:

1. Go to **Netlify Dashboard** → **Domain management** (top level, not site-specific)
2. Find your domain `vtuhy.cz`
3. Add a new DNS record:
   - **Type**: `CNAME` or `A` (Netlify will suggest)
   - **Name**: `knihy`
   - **Value**: Netlify will provide the target (usually your site's Netlify domain or IP)
   - **TTL**: `3600` (or default)

**OR** if using Netlify's automatic DNS:
- Netlify may automatically create the DNS record when you add the subdomain
- Verify it appears in your DNS records

### 4.3 SSL Certificate

Netlify automatically provisions SSL certificates via Let's Encrypt:
- Wait 5-10 minutes after DNS configuration
- SSL will be automatically enabled
- Your site will be accessible at `https://knihy.vtuhy.cz`

## Step 5: Verify Build Configuration

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

This ensures React Router (if used) and SPA routing works correctly.

## Step 6: Test Deployment

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

