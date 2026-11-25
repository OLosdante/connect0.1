(() => {
    const status = document.getElementById("adminStatus");
    const loginForm = document.getElementById("adminLogin");
    const manager = document.getElementById("manager");
    const jobForm = document.getElementById("jobForm");
    const jobsList = document.getElementById("adminJobs");
    const cancelEdit = document.getElementById("cancelEdit");
    const signOutButton = document.getElementById("adminSignOut");
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
    let jobs = [];

    function setStatus(message) {
        status.textContent = message;
    }

    function addText(parent, tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        parent.append(element);
        return element;
    }

    async function requestApi(body) {
        const response = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await response.json().catch(() => ({
            error: "Netlify returned a non-JSON response. Check that the functions are deployed and /api/jobs is routed correctly."
        }));
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
        return result;
    }

    async function loadJobs() {
        const response = await fetch("/api/jobs?admin=1");
        const result = await response.json().catch(() => ({
            error: "Netlify returned a non-JSON response. Check that the functions are deployed and /api/jobs is routed correctly."
        }));
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
        jobs = result.jobs;
        renderJobs();
    }

    function showSignedOut(message) {
        jobs = [];
        jobsList.replaceChildren();
        manager.hidden = true;
        loginForm.hidden = false;
        signOutButton.hidden = true;
        setStatus(message);
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
        jobsList.replaceChildren();
        if (!jobs.length) {
            addText(jobsList, "p", "jobs-status", "No listings yet. Use the form above to add one.");
        }

        for (const job of jobs) {
            const card = document.createElement("article");
            card.className = "admin-job";
            addText(card, "h3", "", job.title);
            addText(card, "p", "", `${job.company} · ${job.location} · ${job.work_type}`);
            addText(card, "span", job.published ? "admin-published" : "admin-draft", job.published ? "Published" : "Draft");

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
        setStatus(`${jobs.length} ${jobs.length === 1 ? "listing" : "listings"} loaded from Netlify storage.`);
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus("Signing in…");
        const passwordInput = document.getElementById("adminPassword");
        try {
            await requestApi({
                action: "login",
                password: passwordInput.value
            });
            passwordInput.value = "";
            loginForm.hidden = true;
            manager.hidden = false;
            signOutButton.hidden = false;
            await loadJobs();
        } catch (error) {
            passwordInput.value = "";
            showSignedOut(`Could not sign in: ${error.message}`);
        }
    });

    signOutButton.addEventListener("click", async () => {
        try {
            await requestApi({ action: "logout" });
            showSignedOut("Signed out.");
        } catch (error) {
            setStatus(`Could not sign out: ${error.message}`);
        }
    });

    jobForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus("Saving job…");
        const job = {
            id: fields.id.value || undefined,
            title: fields.title.value.trim(),
            company: fields.company.value.trim(),
            location: fields.location.value.trim(),
            work_type: fields.workType.value,
            description: fields.description.value.trim(),
            apply_url: fields.applyUrl.value.trim() || null,
            published: fields.published.checked
        };

        try {
            await requestApi({ action: fields.id.value ? "update" : "create", job });
            resetForm();
            await loadJobs();
        } catch (error) {
            setStatus(`Could not save job: ${error.message}`);
        }
    });

    jobsList.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const job = jobs.find((savedJob) => savedJob.id === button.dataset.id);
        if (button.dataset.action === "edit" && job) {
            beginEdit(job);
            return;
        }
        if (button.dataset.action !== "delete" || !job || !window.confirm("Delete this job listing?")) return;

        setStatus("Deleting job…");
        try {
            await requestApi({ action: "delete", id: job.id });
            await loadJobs();
        } catch (error) {
            setStatus(`Could not delete job: ${error.message}`);
        }
    });

    cancelEdit.addEventListener("click", resetForm);

    loadJobs().then(() => {
        loginForm.hidden = true;
        manager.hidden = false;
        signOutButton.hidden = false;
    }).catch((error) => {
        if (error.message.includes("401")) {
            showSignedOut("Sign in with the administrator password to manage listings.");
        } else {
            showSignedOut(`Could not connect to Netlify storage: ${error.message}`);
        }
    });
})();
