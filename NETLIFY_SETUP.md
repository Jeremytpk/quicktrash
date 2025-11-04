# Netlify Deployment Setup

This project is configured for automatic deployment to Netlify on every GitHub push.

## Setup Instructions

### 1. Connect to Netlify
1. Go to [Netlify](https://netlify.com) and sign up/login
2. Click "New site from Git"
3. Connect your GitHub account and select this repository
4. Use these build settings:
   - **Build command**: `npm run build:web`
   - **Publish directory**: `dist`

### 2. Environment Variables
In your Netlify dashboard, go to Site settings > Environment variables and add:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 3. GitHub Secrets (Optional - for GitHub Actions)
If using the GitHub workflow, add these secrets to your repository:
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
- `NETLIFY_SITE_ID`: Your site ID from Netlify
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

## Automatic Deployment

The site will automatically deploy when you push to:
- `main` branch
- `payment-integration-clean` branch
- `develop` branch

## Local Testing

To test the web build locally:
```bash
npm run build:web
npm run preview
```

## Troubleshooting

### Build Fails
- Make sure all environment variables are set in Netlify
- Check that the build works locally first
- Ensure all dependencies are in package.json (not just devDependencies)

### Environment Variables Not Working
- Environment variables for Expo web must be prefixed with `EXPO_PUBLIC_`
- Variables are embedded at build time, not runtime
- Redeploy after changing environment variables

### Routing Issues
- The `netlify.toml` file handles client-side routing with `/*` redirect
- All routes will serve `index.html` for proper SPA behavior
