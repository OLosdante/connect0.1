# Manage Connect jobs

Open `admin.html` in the same browser and on the same website address where you use `jobs.html`. Fill in the job details and select **Save job**. Check **Show this job on the jobs page in this browser** to display it on the jobs page. You can edit or delete saved listings from the manager.

Jobs are stored as a JSON array in that browser's local storage. No database or sign-in is required. Because this is browser-only storage, jobs are not uploaded to the website and are not shared with other devices or visitors. Clearing the browser's site data will remove saved jobs. To publish listings for all visitors, the site needs a shared publishing service such as a database or server.

Use a local web server (for example, VS Code Live Server) when testing the pages. The previous Supabase setup files are no longer used by the job manager.
