import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    withCredentials: true, // ← add this
});

export const notesApi = {
    getAll: (params) => api.get("/notes", { params }).then((r) => r.data),
    getOne: (id) => api.get(`/notes/${id}`).then((r) => r.data),
    create: (data) => api.post("/notes", data).then((r) => r.data),
    update: (id, d) => api.put(`/notes/${id}`, d).then((r) => r.data),
    delete: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
};

export const resourcesApi = {
    getAll: (params) => api.get("/resources", { params }).then((r) => r.data),
    getFree: () => api.get("/resources/free").then((r) => r.data),
    getCatalogue: () => api.get("/resources/catalogue").then((r) => r.data),
    getOne: (id) => api.get(`/resources/${id}`).then((r) => r.data),
    create: (data) => api.post("/resources", data).then((r) => r.data),
    update: (id, d) => api.put(`/resources/${id}`, d).then((r) => r.data),
    delete: (id) => api.delete(`/resources/${id}`).then((r) => r.data),
};

export const subscriptionsApi = {
    mine: () => api.get("/subscriptions/mine").then((r) => r.data),
    access: (course, semester) =>
        api
            .get("/subscriptions/access", { params: { course, semester } })
            .then((r) => r.data),
    grant: (data) => api.post("/subscriptions/grant", data).then((r) => r.data),
    revoke: (id) => api.delete(`/subscriptions/${id}`).then((r) => r.data),
};

export const authApi = {
    me: () => api.get("/auth/me").then((r) => r.data),
    updateProfile: (data) =>
        api.patch("/auth/profile", data).then((r) => r.data),
    logout: () => api.post("/auth/logout").then((r) => r.data),
};

export const uploadApi = {
    // Upload a PDF + metadata as a multipart form (admin only).
    // For files ≤ 10 MB the server returns JSON directly.
    // For files  > 10 MB the server returns an SSE stream — use
    // AdminUpload's fetch + ReadableStream logic instead of this helper.
    uploadResource: (formData) =>
        fetch(`${import.meta.env.VITE_API_URL}/upload/resource`, {
            method: "POST",
            credentials: "include",
            body: formData,
        }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Upload failed");
            return data;
        }),

    deleteResource: (id) =>
        fetch(`${import.meta.env.VITE_API_URL}/upload/resource/${id}`, {
            method: "DELETE",
            credentials: "include",
        }).then((r) => r.json()),

    // Fetch the ordered page-image URL list for a paged-mode resource
    getResourcePages: (resourceId) =>
        fetch(`${import.meta.env.VITE_API_URL}/resources/${resourceId}/pages`, {
            credentials: "include",
        }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Failed to fetch pages");
            return data; // { pageCount, pages: [...urls] }
        }),
};

export const paymentApi = {
    // Create a Razorpay order on the server
    createOrder: (body) =>
        api.post("/payment/create-order", body).then((r) => r.data),

    // Verify payment after Razorpay checkout succeeds
    verify: (body) => api.post("/payment/verify", body).then((r) => r.data),

    // Validate a promo code for a given plan
    validatePromo: (code, pack) =>
        api.post("/payment/validate-promo", { code, pack }).then((r) => r.data),
};

export const promoApi = {
    getAll: () => api.get("/admin/promos").then((r) => r.data),
    create: (data) => api.post("/admin/promos", data).then((r) => r.data),
    update: (id, data) =>
        api.patch(`/admin/promos/${id}`, data).then((r) => r.data),
    toggle: (id) => api.patch(`/admin/promos/${id}/toggle`).then((r) => r.data),
    delete: (id) => api.delete(`/admin/promos/${id}`).then((r) => r.data),
};

export const contactApi = {
    send: (data) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        return api
            .post("/contact", data, { signal: controller.signal })
            .then((r) => {
                clearTimeout(timeout);
                return r.data;
            })
            .catch((err) => {
                clearTimeout(timeout);
                throw err;
            });
    },
};

export const curriculumApi = {
    // Public
    getAll: (program) =>
        api
            .get("/curriculum", { params: program ? { program } : {} })
            .then((r) => r.data),
    getAllSubjects: (program, branch) =>
        api
            .get("/curriculum/all-subjects", { params: { program, branch } })
            .then((r) => r.data),
    getSubjects: (program, branch, sem) =>
        api
            .get("/curriculum/subjects", { params: { program, branch, sem } })
            .then((r) => r.data),
    // Admin
    getOne: (id) => api.get(`/curriculum/${id}`).then((r) => r.data),
    addSubject: (id, data) =>
        api.post(`/curriculum/${id}/subjects`, data).then((r) => r.data),
    editSubject: (id, data) =>
        api.patch(`/curriculum/${id}/subjects`, data).then((r) => r.data),
    deleteSubject: (id, data) =>
        api.delete(`/curriculum/${id}/subjects`, { data }).then((r) => r.data),
};

export const notifApi = {
    getAll: () => api.get("/notifications").then((r) => r.data),
    dismiss: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
    readAll: () => api.patch("/notifications/read-all").then((r) => r.data),
};

export const plansApi = {
    getAll: () => api.get("/plans").then((r) => r.data),
    adminGetAll: () => api.get("/admin/plans").then((r) => r.data),
    create: (data) => api.post("/admin/plans", data).then((r) => r.data),
    update: (id, data) =>
        api.patch(`/admin/plans/${id}`, data).then((r) => r.data),
    delete: (id) => api.delete(`/admin/plans/${id}`).then((r) => r.data),
};

export const broadcastApi = {
    send: (data) => api.post("/admin/broadcast", data).then((r) => r.data),
    searchUsers: (q) =>
        api.get("/admin/users/search", { params: { q } }).then((r) => r.data),
    getAnnouncements: () => api.get("/admin/announcements").then((r) => r.data),
    deleteAnnouncement: (id) =>
        api.delete(`/admin/announcements/${id}`).then((r) => r.data),
    getSentNotifications: (params) =>
        api.get("/admin/notifications/sent", { params }).then((r) => r.data),
};

export const violationApi = {
    report: (data) =>
        api.post("/admin/violation-report", data).then((r) => r.data),
};