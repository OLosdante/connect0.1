(() => {
    const storageKey = "connect.jobs.v1";
    const status = document.getElementById("adminStatus");
    const jobForm = document.getElementById("jobForm");
    const jobsList = document.getElementById("adminJobs");
    const cancelEdit = document.getElementById("cancelEdit");
    const fields = {
        id: document.getElementById("jobId"),
        title: document.getElementById("jobTitle"),
        company: document.getElementById("jobCompany"),
        location: document.getElementById("jobLocation"),
        workType: document.getElementById("jobWorkType"),
        description: document.getElementById("jobDescription"),
        applyUrl: document.getElementById("jobApplyUrl"),
        published: document.getElementById("jobPublished")
    };

    function setStatus(message) {
        status.textContent = message;
    }

    function readJobs() {
        const stored = window.localStorage.getItem(storageKey);
        if (stored === null) return [];

        const jobs = JSON.parse(stored);
        if (!Array.isArray(jobs)) {
            throw new Error("Saved job data is not a list. Clear the saved browser data before adding jobs.");
        }
        return jobs;
    }

    function saveJobs(jobs) {
        window.localStorage.setItem(storageKey, JSON.stringify(jobs));
    }

    function addText(parent, tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        parent.append(element);
        return element;
    }

    function resetForm() {
        jobForm.reset();
        fields.id.value = "";
        document.getElementById("formHeading").textContent = "Add a job";
        cancelEdit.hidden = true;
    }

    function beginEdit(job) {
        fields.id.value = job.id;
        fields.title.value = job.title;
        fields.company.value = job.company;
        fields.location.value = job.location;
        fields.workType.value = job.work_type;
        fields.description.value = job.description;
        fields.applyUrl.value = job.apply_url || "";
        fields.published.checked = job.published;
        document.getElementById("formHeading").textContent = "Edit job";
        cancelEdit.hidden = false;
        fields.title.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderJobs() {
        const jobs = readJobs().sort((first, second) => second.created_at - first.created_at);
        jobsList.replaceChildren();
        if (!jobs.length) {
            addText(jobsList, "p", "jobs-status", "No listings yet. Use the form above to add one.");
        }

        for (const job of jobs) {
            const card = document.createElement("article");
            card.className = "admin-job";
            addText(card, "h3", "", job.title);
            addText(card, "p", "", `${job.company} · ${job.location} · ${job.work_type}`);
            addText(card, "span", job.published ? "admin-published" : "admin-draft", job.published ? "Shown on this browser's jobs page" : "Draft");

            const actions = document.createElement("div");
            actions.className = "admin-form-actions";
            const editButton = addText(actions, "button", "admin-button admin-button-secondary", "Edit");
            editButton.type = "button";
            editButton.dataset.action = "edit";
            editButton.dataset.id = job.id;
            const deleteButton = addText(actions, "button", "admin-button admin-button-danger", "Delete");
            deleteButton.type = "button";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = job.id;
            card.append(actions);
            jobsList.append(card);
        }
        setStatus(`${jobs.length} ${jobs.length === 1 ? "listing" : "listings"} saved in this browser.`);
    }

    jobForm.addEventListener("submit", (event) => {
        event.preventDefault();
        setStatus("Saving job in this browser…");

        try {
            const jobs = readJobs();
            const existingIndex = jobs.findIndex((savedJob) => savedJob.id === fields.id.value);
            const existingJob = existingIndex === -1 ? null : jobs[existingIndex];
            const job = {
                id: existingJob ? existingJob.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                title: fields.title.value.trim(),
                company: fields.company.value.trim(),
                location: fields.location.value.trim(),
                work_type: fields.workType.value,
                description: fields.description.value.trim(),
                apply_url: fields.applyUrl.value.trim() || null,
                published: fields.published.checked,
                created_at: existingJob ? existingJob.created_at : Date.now()
            };
            if (existingIndex === -1) {
                jobs.push(job);
            } else {
                jobs[existingIndex] = job;
            }
            saveJobs(jobs);
            resetForm();
            renderJobs();
        } catch (error) {
            setStatus(`Could not save job: ${error.message}`);
        }
    });

    jobsList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        try {
            const jobs = readJobs();
            const job = jobs.find((savedJob) => savedJob.id === button.dataset.id);
            if (button.dataset.action === "edit" && job) {
                beginEdit(job);
                return;
            }
            if (button.dataset.action === "delete" && job && window.confirm("Delete this job listing?")) {
                saveJobs(jobs.filter((savedJob) => savedJob.id !== job.id));
                setStatus("Job deleted from this browser.");
                renderJobs();
            }
        } catch (error) {
            setStatus(`Could not update listings: ${error.message}`);
        }
    });

    cancelEdit.addEventListener("click", resetForm);

    try {
        renderJobs();
    } catch (error) {
        setStatus(`Could not load saved jobs: ${error.message}`);
    }
})();
