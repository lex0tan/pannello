const API_BASE_URL = "";           // vuoto → /orders, /orders/... direttamente
const STATIC_BASE_URL = "/static"; // punta a C:/.../source

const userMenu = document.querySelector(".discord-user-menu");
const userTab = document.getElementById("userTab");

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

document.addEventListener("DOMContentLoaded", () => {
    // GET LOGO
    fetch(`config/logo.png`)
        .then(response => response.blob())
        .then(blob => {
            const logoUrl = URL.createObjectURL(blob);
            const logoImg = document.getElementById("logo");
            if (logoImg) {
                logoImg.src = logoUrl;
            }
        })
        .catch(error => {
            console.error("Error loading logo:", error);
        });
});



userTab.addEventListener("click", () => {
    userMenu.classList.toggle("open");
});

async function apiRequest(method, path, body = null) {
    try {
        const options = {
            method,
            headers: {}
        };

        if (body !== null && body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${API_BASE_URL}${path}`, options);

        let payload = null;
        try {
            payload = await res.json();
        } catch (e) {
            console.warn(`⚠ Risposta non JSON da ${method} ${path}`, e);
        }

        const hasSuccessFlag = payload && typeof payload.success === "boolean";
        const apiSuccess = hasSuccessFlag ? payload.success : res.ok;

        if (!res.ok || apiSuccess === false) {
            const errorMsg = payload?.error || res.statusText || "Errore HTTP sconosciuto";
            console.error(`❌ Errore API ${method} ${path}:`, errorMsg);
            return {
                success: false,
                data: null,
                error: errorMsg
            };
        }

        const data = payload && "data" in payload ? payload.data : (payload ?? null);

        return {
            success: true,
            data,
            error: null
        };

    } catch (err) {
        console.error(`❌ Errore di rete chiamando ${method} ${path}:`, err);
        return {
            success: false,
            data: null,
            error: "Errore di rete durante la chiamata al server"
        };
    }
}

async function apiGet(path) {
    return apiRequest("GET", path);
}

async function apiPost(path, body) {
    return apiRequest("POST", path, body);
}

async function apiDelete(path) {
    return apiRequest("DELETE", path);
}

async function toastpopup(message, type = "info", duration = 3000) {
    const containerId = "toastpopup-container";

    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement("div");
        container.id = containerId;
        container.style.position = "fixed";
        container.style.top = "1rem";
        container.style.right = "1rem";
        container.style.zIndex = "1055";
        container.style.maxWidth = "320px";
        document.body.appendChild(container);
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show shadow`;
    alert.role = "alert";
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    container.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove("show");
        alert.classList.add("fade");
        setTimeout(() => alert.remove(), 300);
    }, duration);
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        return String(value);
    }
    return d.toLocaleString("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

async function loadSidebar() {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    const res = await fetch("config/sidebar.html"); // adatta il path ai tuoi static
    if (!res.ok) {
        console.error("Failed to load sidebar", res.status);
        return;
    }

    const html = await res.text();
    container.innerHTML = html;

    initSidebarActiveState();
}

function initSidebarActiveState() {
    const activePage = document.body.dataset.page;
    if (!activePage) return;

    const link = document.querySelector(`[data-page="${activePage}"]`);
    if (!link) return;

    link.classList.add("active");

    const collapseEl = link.closest(".accordion-collapse");
    if (!collapseEl) return;

    collapseEl.classList.add("show");
    const buttonEl = collapseEl.previousElementSibling?.querySelector(".accordion-button");
    if (buttonEl) buttonEl.classList.remove("collapsed");
}

document.addEventListener("DOMContentLoaded", () => {
    loadSidebar();
});

async function fetchBrands() {
    try {
        const response = await apiGet("/master-data/brands");
        if (response?.success === true) {
            return response.data ?? {};
        }
        toastpopup("Failed to fetch brands: " + (response?.error ?? "Unknown error"), "danger");
        return {};
    } catch (error) {
        toastpopup("Error fetching brands: " + String(error), "danger");
        return {};
    }
}

async function fetchCategories() {
    try {
        const response = await apiGet("/master-data/categories");
        if (response?.success === true) {
            return response.data ?? {};
        }
        toastpopup("Failed to fetch categories: " + (response?.error ?? "Unknown error"), "danger");
        return {};
    } catch (error) {
        toastpopup("Error fetching categories: " + String(error), "danger");
        return {};
    }
}

async function fetchSuppliers() {
    try {
        const response = await apiGet("/master-data/suppliers");
        if (response?.success === true) {
            return response.data ?? {};
        }
        toastpopup("Failed to fetch suppliers: " + (response?.error ?? "Unknown error"), "danger");
        return {};
    } catch (error) {
        toastpopup("Error fetching suppliers: " + String(error), "danger");
        return {};
    }
}

function selectValueToNullableInt(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return null;

    const v = (el.value ?? "").trim();
    if (v === "" || v === "0") return null;

    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}