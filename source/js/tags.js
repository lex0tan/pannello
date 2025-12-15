    let productTagsCache = new Map();   // id -> { id, tag_name, color, status }
    let selectedTagIds = new Set();   // selected tag ids (int)

    // Change these if your endpoints are different
    const PRODUCT_TAGS_LIST_ENDPOINT = "/master-data/product-tags";
    const PRODUCT_TAGS_CREATE_ENDPOINT = "/master-data/product-tags";

    // ------------------------------
    // Tags - helpers (normalize)
    // ------------------------------
    function normalizeTagsData(raw) {
        // Accepts:
        // 1) Array: [{id, tag_name, color, status}, ...]
        // 2) Object map: { "1": "Promo", "2": {tag_name:"Fragile", ...}, ... }
        // Returns array of objects: [{id, tag_name, color, status}, ...]
        if (!raw) return [];

        if (Array.isArray(raw)) {
            return raw
                .filter(x => x && x.id != null)
                .map(x => ({
                    id: Number(x.id),
                    tag_name: String(x.tag_name ?? x.name ?? "").trim(),
                    color: x.color ?? null,
                    status: (x.status == null ? 1 : Number(x.status)),
                }))
                .filter(x => x.id && x.tag_name.length > 0);
        }

        if (typeof raw === "object") {
            return Object.entries(raw).map(([k, v]) => {
                const id = Number(k);
                if (!Number.isFinite(id)) return null;

                if (typeof v === "string") {
                    return { id, tag_name: v.trim(), color: null, status: 1 };
                }

                if (v && typeof v === "object") {
                    return {
                        id,
                        tag_name: String(v.tag_name ?? v.name ?? "").trim(),
                        color: v.color ?? null,
                        status: (v.status == null ? 1 : Number(v.status)),
                    };
                }

                return null;
            }).filter(Boolean).filter(x => x.tag_name.length > 0);
        }

        return [];
    }

    function escapeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // ------------------------------
    // Tags - API
    // ------------------------------
    async function fetchProductTags() {
        const res = await apiGet(PRODUCT_TAGS_LIST_ENDPOINT);
        if (!res || res.success !== true) {
            toastpopup("Errore nel caricamento tag: " + (res?.error ?? "unknown"), "danger");
            return [];
        }
        return normalizeTagsData(res.data);
    }

    async function createProductTag(tagName) {
        const clean = String(tagName ?? "").trim();
        if (!clean) return null;

        // Optional: if you want a default color, set it here or omit it.
        const res = await apiPost(PRODUCT_TAGS_CREATE_ENDPOINT, {
            tag_name: clean
            // color: null
        });

        if (!res || res.success !== true) {
            toastpopup("Errore creazione tag: " + (res?.error ?? "unknown"), "danger");
            return null;
        }

        // Accept both {id, tag_name,...} or nested in res.data
        const t = res.data ?? null;
        if (!t || t.id == null) return null;

        return {
            id: Number(t.id),
            tag_name: String(t.tag_name ?? t.name ?? clean).trim(),
            color: t.color ?? null,
            status: (t.status == null ? 1 : Number(t.status)),
        };
    }

    // ------------------------------
    // Tags - UI
    // ------------------------------
    function renderSelectedTags() {
        const container = document.getElementById("selectedTags");
        if (!container) return;

        const tags = Array.from(selectedTagIds)
            .map(id => productTagsCache.get(id))
            .filter(Boolean)
            .sort((a, b) => a.tag_name.localeCompare(b.tag_name));

        container.innerHTML = tags.map(t => {
            const safeName = escapeHtml(t.tag_name);
            const safeColor = t.color ? escapeHtml(t.color) : null;

            const style = safeColor
                ? `style="background-color:${safeColor}; color:#fff;"`
                : `class="text-bg-secondary"`;

            return `
            <span class="badge rounded-pill d-inline-flex align-items-center gap-2 ${safeColor ? "" : "text-bg-secondary"}"
                  ${safeColor ? `style="background-color:${safeColor}; color:#fff;"` : ""}>
                ${safeName}
                <button type="button"
                        class="btn btn-sm btn-link p-0 text-white-50 tag-remove-btn"
                        data-tagid="${t.id}"
                        aria-label="Rimuovi tag">
                    <i class="bi bi-x"></i>
                </button>
            </span>
        `;
        }).join("");

        // bind remove
        container.querySelectorAll(".tag-remove-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const id = Number(btn.dataset.tagid);
                selectedTagIds.delete(id);
                renderSelectedTags();
            });
        });
    }

    function hideSuggestions() {
        const box = document.getElementById("tagSuggestions");
        if (!box) return;
        box.classList.add("d-none");
        box.innerHTML = "";
    }

    function showSuggestions(itemsHtml) {
        const box = document.getElementById("tagSuggestions");
        if (!box) return;
        box.innerHTML = itemsHtml;
        box.classList.remove("d-none");
    }

    function selectTagById(id) {
        const numericId = Number(id);
        if (!Number.isFinite(numericId)) return;
        if (!productTagsCache.has(numericId)) return;

        selectedTagIds.add(numericId);
        renderSelectedTags();

        const input = document.getElementById("tagSearchInput");
        if (input) input.value = "";

        hideSuggestions();
    }

    function buildSuggestions(query) {
        const q = String(query ?? "").trim().toLowerCase();
        if (!q) {
            hideSuggestions();
            return;
        }

        const allActive = Array.from(productTagsCache.values())
            .filter(t => (t.status ?? 1) === 1);

        const matches = allActive
            .filter(t => t.tag_name.toLowerCase().includes(q))
            .sort((a, b) => a.tag_name.localeCompare(b.tag_name))
            .slice(0, 8);

        let html = "";

        // Existing matches
        html += matches.map(t => {
            const safe = escapeHtml(t.tag_name);
            return `
            <button type="button"
                    class="list-group-item list-group-item-action"
                    data-action="select"
                    data-tagid="${t.id}">
                <i class="bi bi-tag me-2"></i>${safe}
            </button>
        `;
        }).join("");

        // If not exact match, add "create"
        const exact = allActive.some(t => t.tag_name.toLowerCase() === q);
        if (!exact) {
            const safeQ = escapeHtml(String(query).trim());
            html += `
            <button type="button"
                    class="list-group-item list-group-item-action"
                    data-action="create"
                    data-tagname="${safeQ}">
                <i class="bi bi-plus-circle me-2"></i>Crea tag "<strong>${safeQ}</strong>"
            </button>
        `;
        }

        showSuggestions(html);
    }

    async function initTagPicker() {
        const input = document.getElementById("tagSearchInput");
        const box = document.getElementById("tagSuggestions");

        if (!input || !box) return;

        // Click on suggestion
        box.addEventListener("click", async (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;

            const action = btn.dataset.action;

            if (action === "select") {
                selectTagById(btn.dataset.tagid);
                return;
            }

            if (action === "create") {
                const name = btn.dataset.tagname;
                const created = await createProductTag(name);
                if (!created) return;

                productTagsCache.set(created.id, created);
                selectTagById(created.id);
            }
        });

        // Input typing -> suggestions
        input.addEventListener("input", () => {
            buildSuggestions(input.value);
        });

        // Enter to create/select
        input.addEventListener("keydown", async (e) => {
            if (e.key !== "Enter") return;

            e.preventDefault();

            const val = input.value.trim();
            if (!val) return;

            // If exact exists, select it
            const allActive = Array.from(productTagsCache.values()).filter(t => (t.status ?? 1) === 1);
            const exact = allActive.find(t => t.tag_name.toLowerCase() === val.toLowerCase());
            if (exact) {
                selectTagById(exact.id);
                return;
            }

            // else create
            const created = await createProductTag(val);
            if (!created) return;

            productTagsCache.set(created.id, created);
            selectTagById(created.id);
        });

        // Close suggestions on outside click
        document.addEventListener("click", (e) => {
            if (e.target.closest("#tagSuggestions")) return;
            if (e.target.closest("#tagSearchInput")) return;
            hideSuggestions();
        });
    }

    // ------------------------------
    // Tags - bootstrap loader
    // ------------------------------
    async function loadProductTagsIntoCache() {
        const tags = await fetchProductTags();
        productTagsCache = new Map(tags.map(t => [t.id, t]));
    }

    // Helper you can call when saving the product payload
    function getSelectedProductTagIds() {
        return Array.from(selectedTagIds.values());
    }

    // Optional: if you open modal multiple times, reset tags state
    function resetSelectedTags(tagIds = []) {
        selectedTagIds = new Set((tagIds ?? []).map(Number).filter(Number.isFinite));
        renderSelectedTags();
        hideSuggestions();
        const input = document.getElementById("tagSearchInput");
        if (input) input.value = "";
    }