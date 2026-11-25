import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const cookieName = "connect_admin";
const sessionLifetimeSeconds = 8 * 60 * 60;
const allowedWorkTypes = new Set(["Remote", "Hybrid", "Onsite", "Internship", "Contract"]);
const store = getStore("connect-jobs");

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function jsonResponse(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...headers
        }
    });
}

function requireAdminConfiguration() {
    const password = process.env.JOBS_ADMIN_PASSWORD;
    const sessionSecret = process.env.JOBS_SESSION_SECRET;
    if (!password || password.length < 16 || !sessionSecret || sessionSecret.length < 32) {
        throw new HttpError(503, "Admin access is not configured. Set JOBS_ADMIN_PASSWORD and JOBS_SESSION_SECRET in Netlify.");
    }
    return { password, sessionSecret };
}

function hash(value) {
    return createHash("sha256").update(value).digest();
}

function signExpiry(expiry, secret) {
    return createHmac("sha256", secret).update(expiry).digest("base64url");
}

function createSessionCookie(secret) {
    const expiry = String(Math.floor(Date.now() / 1000) + sessionLifetimeSeconds);
    const token = `${expiry}.${signExpiry(expiry, secret)}`;
    return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}`;
}

function clearSessionCookie() {
    return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function hasAdminSession(request, secret) {
    const cookieHeader = request.headers.get("cookie") || "";
    const value = cookieHeader.split(";").map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
    if (!value) return false;

    const separator = value.indexOf(".");
    if (separator < 1) return false;
    const expiry = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    if (!/^\d+$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000)) return false;

    const expected = Buffer.from(signExpiry(expiry, secret));
    const provided = Buffer.from(signature);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function readBody(request) {
    const text = await request.text();
    if (text.length > 12000) throw new HttpError(413, "Request is too large.");
    try {
        return JSON.parse(text);
    } catch {
        throw new HttpError(400, "Request body must be valid JSON.");
    }
}

function validateJob(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new HttpError(400, "Job details are required.");
    }

    const textFields = ["title", "company", "location", "description"];
    const job = {};
    for (const field of textFields) {
        if (typeof input[field] !== "string" || !input[field].trim()) {
            throw new HttpError(400, `${field} is required.`);
        }
        const value = input[field].trim();
        const maximum = field === "description" ? 5000 : 160;
        if (value.length > maximum) throw new HttpError(400, `${field} is too long.`);
        job[field] = value;
    }

    if (!allowedWorkTypes.has(input.work_type)) {
        throw new HttpError(400, "Choose a valid work type.");
    }
    if (typeof input.published !== "boolean") {
        throw new HttpError(400, "Choose whether to publish this job.");
    }
    job.work_type = input.work_type;
    job.published = input.published;

    if (input.apply_url === null || input.apply_url === "") {
        job.apply_url = null;
    } else {
        if (typeof input.apply_url !== "string") throw new HttpError(400, "Application link is invalid.");
        let url;
        try {
            url = new URL(input.apply_url);
        } catch {
            throw new HttpError(400, "Application link must be a valid HTTP or HTTPS URL.");
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new HttpError(400, "Application link must use HTTP or HTTPS.");
        }
        job.apply_url = url.href;
    }
    return job;
}

function validateId(id) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new HttpError(400, "Job ID is invalid.");
    }
    return id;
}

async function readJobs() {
    const { blobs } = await store.list({ prefix: "jobs/" });
    const records = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json" })));
    return records.filter((job) => job && typeof job === "object");
}

async function handleGet(request) {
    const url = new URL(request.url);
    const wantsAdmin = url.searchParams.get("admin") === "1";
    if (wantsAdmin) {
        const { sessionSecret } = requireAdminConfiguration();
        if (!hasAdminSession(request, sessionSecret)) {
            return jsonResponse({ error: "401: Sign in is required." }, 401);
        }
    }

    const jobs = await readJobs();
    const visibleJobs = wantsAdmin ? jobs : jobs.filter((job) => job.published);
    visibleJobs.sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
    return jsonResponse({ jobs: visibleJobs });
}

async function handlePost(request) {
    const body = await readBody(request);
    if (!body || typeof body.action !== "string") {
        throw new HttpError(400, "Action is required.");
    }

    if (body.action === "login") {
        const { password, sessionSecret } = requireAdminConfiguration();
        const submittedPassword = typeof body.password === "string" ? body.password : "";
        if (!timingSafeEqual(hash(password), hash(submittedPassword))) {
            throw new HttpError(401, "Incorrect admin password.");
        }
        return jsonResponse({ authenticated: true }, 200, { "Set-Cookie": createSessionCookie(sessionSecret) });
    }

    if (body.action === "logout") {
        return jsonResponse({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie() });
    }

    const { sessionSecret } = requireAdminConfiguration();
    if (!hasAdminSession(request, sessionSecret)) {
        throw new HttpError(401, "Admin sign-in has expired. Sign in again.");
    }

    if (body.action === "create") {
        const job = validateJob(body.job);
        job.id = randomUUID();
        job.created_at = new Date().toISOString();
        const { modified } = await store.setJSON(`jobs/${job.id}`, job, { onlyIfNew: true });
        if (!modified) throw new HttpError(409, "Could not create the job. Please retry.");
        return jsonResponse({ job }, 201);
    }

    if (body.action === "update") {
        const id = validateId(body.job?.id);
        const key = `jobs/${id}`;
        const existing = await store.getWithMetadata(key, { type: "json" });
        if (!existing) throw new HttpError(404, "Job listing was not found.");
        const job = { ...validateJob(body.job), id, created_at: existing.data.created_at };
        const { modified } = await store.setJSON(key, job, { onlyIfMatch: existing.etag });
        if (!modified) throw new HttpError(409, "This job changed while you were editing it. Reload and try again.");
        return jsonResponse({ job });
    }

    if (body.action === "delete") {
        const id = validateId(body.id);
        const key = `jobs/${id}`;
        if (await store.get(key) === null) throw new HttpError(404, "Job listing was not found.");
        await store.delete(key);
        return jsonResponse({ deleted: true });
    }

    throw new HttpError(400, "Unknown action.");
}

export default async (request) => {
    try {
        if (request.method === "GET") return await handleGet(request);
        if (request.method === "POST") return await handlePost(request);
        return jsonResponse({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });
    } catch (error) {
        if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
        console.error("Jobs function failed:", error);
        return jsonResponse({ error: "The jobs service could not complete the request. Check the Netlify function logs." }, 500);
    }
};
