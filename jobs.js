(() => {
    const storageKey = "connect.jobs.v1";
    const status = document.getElementById("jobsStatus");
    const listings = document.getElementById("jobListings");
    const search = document.getElementById("jobSearch");
    const typeFilter = document.getElementById("jobType");
    const mobileNavButton = document.getElementById("mobilenav");
    const mobileNav = document.getElementById("mobileN");

    mobileNavButton.addEventListener("click", () => {
        const isOpen = mobileNav.style.display === "flex";
        mobileNav.style.display = isOpen ? "none" : "flex";
        mobileNavButton.setAttribute("aria-expanded", String(!isOpen));
    });

    function addText(parent, tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        parent.append(element);
        return element;
    }

    function loadJobs() {
        const stored = window.localStorage.getItem(storageKey);
        if (stored === null) return [];

        const jobs = JSON.parse(stored);
        if (!Array.isArray(jobs)) {
            throw new Error("Saved job data is not a list. Contact the site administrator.");
        }
        return jobs.filter((job) => job && job.published);
    }

    let jobs;
    try {
        jobs = loadJobs();
    } catch (error) {
        status.textContent = `Could not load jobs: ${error.message}`;
        return;
    }

    function renderJobs() {
        const query = search.value.trim().toLowerCase();
        const selectedType = typeFilter.value;
        const matches = jobs.filter((job) => {
            const text = `${job.title} ${job.company} ${job.location}`.toLowerCase();
            return text.includes(query) && (!selectedType || job.work_type === selectedType);
        });

        listings.replaceChildren();
        if (!matches.length) {
            status.textContent = jobs.length
                ? "No jobs match your search. Listings are stored in this browser only."
                : "There are no current openings. Add jobs from Manage jobs; listings are stored in this browser only.";
            return;
        }

        status.textContent = `${matches.length} ${matches.length === 1 ? "job" : "jobs"} available in this browser only`;
        for (const job of matches) {
            const card = document.createElement("article");
            card.className = "job-card";
            addText(card, "span", "job-type", job.work_type);
            addText(card, "h2", "", job.title);
            addText(card, "p", "job-company", job.company);
            addText(card, "p", "job-location", job.location);
            addText(card, "p", "job-description", job.description);

            if (job.apply_url) {
                let applyUrl;
                try {
                    applyUrl = new URL(job.apply_url);
                } catch {
                    addText(card, "p", "job-link-warning", "Application link is invalid; contact the employer for application details.");
                    listings.append(card);
                    continue;
                }
                if (applyUrl.protocol !== "https:" && applyUrl.protocol !== "http:") {
                    addText(card, "p", "job-link-warning", "Application link is invalid; contact the employer for application details.");
                } else {
                    const link = addText(card, "a", "job-apply", "Apply now");
                    link.href = applyUrl.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                }
            }
            listings.append(card);
        }
    }

    search.addEventListener("input", renderJobs);
    typeFilter.addEventListener("change", renderJobs);
    renderJobs();
})();
