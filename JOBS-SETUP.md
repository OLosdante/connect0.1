# Shared Connect job listings without a database

The site uses Netlify Functions and Netlify Blobs. Blobs is Netlify-managed file/object storage, not a relational database. Published jobs are readable from any browser; adding, editing, and deleting jobs requires the administrator password.

## Deploy and configure

1. Deploy this project to Netlify through a connected Git repository or the Netlify CLI. Static drag-and-drop deploys do not bundle the functions.
2. The included `netlify.toml` sets the site publish directory to the project root and the functions directory to `netlify/functions`. No build command is required. Netlify installs `@netlify/blobs` from `package.json`.
3. In **Site configuration → Environment variables**, add:
   - `JOBS_ADMIN_PASSWORD`: a strong password of at least 16 characters.
   - `JOBS_SESSION_SECRET`: a randomly generated secret of at least 32 characters. Generate one locally with Node.js:

     ```sh
     node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
     ```

   Keep both values private; do not put them in website JavaScript or commit them to the project. Trigger a new deploy after adding or changing the variables.
4. Open `/admin.html` on your Netlify site, sign in with `JOBS_ADMIN_PASSWORD`, and create jobs. Select **Publish this job on the public jobs page** for listings visitors should see.
5. Open `/jobs.html` to verify published listings. Netlify stores data persistently in a shared Blobs store, so deployments and different browsers use the same listings.

The administrator session is an HTTP-only secure cookie and expires after eight hours. If the password or session secret changes, sign in again. The jobs API only returns published listings to public requests; administrator requests require a valid session.

When developing locally, use `netlify dev` so the function and Blobs integration are available. Existing jobs saved in browser local storage or a Supabase project are not migrated automatically.
