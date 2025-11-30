let positionsCache = null;
let ordersById = {};
let paymentMethods = null;
let tags = null;

let currentPage         = 0;
let currentStatusFilter = null;          // 6,7,2 o null per tutti
let currentSortBy       = "creationDate";
let currentSortDir      = "desc";        // "asc" | "desc"
let ordersPageSize      = 20;            // deve combaciare con getOrdersPerPage()

async function loadStatuses() {
    const res = await apiGet(`/config/status.json`);
    if (!res.success) {
        await toastpopup("Errore nel caricamento degli status: " + res.error, "danger");
        return;
    }

    const statuses = res.data;

    document.querySelectorAll(".status-btn").forEach(button => {
        const menu = button.parentElement.querySelector(".status-menu");
        const currentId = button.dataset.currentStatus;
        const currentStatus = statuses[currentId];

        Object.entries(statuses).forEach(([id, status]) => {
            const color = status.color;
            const isValidHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(color);
            if (!isValidHex) {
                toastpopup(`Colore HEX non valido per status ${id}`, "danger");
                return;
            }

            const li = document.createElement("li");
            li.innerHTML = `
                <a class="dropdown-item status" data-status="${id}" href="#">
                    <span class="badge" style="background-color: ${color}; color: #fff;">
                        ${status.label}
                    </span>
                </a>`;

            li.addEventListener("click", e => {
                e.preventDefault();
                updateStatusButton(button, Number(id), status);
            });

            menu.appendChild(li);
        });

        if (currentStatus) {
            button.innerHTML =
                `<span class="badge" style="background-color: ${currentStatus.color}; color: #fff;">${currentStatus.label}</span>`;
        } else {
            console.error(`❌ Status ID "${currentId}" non valido`);
            toastpopup(`Errore: status ID "${currentId}" non riconosciuto`, "danger");
        }
    });
}

async function loadPositions() {
    try {
        const res = await apiGet(`/config/positions.json`);
        const data = res.data;

        if (!data || !Array.isArray(data.positions)) {
            throw new Error("Formato dati non valido");
        }

        positionsCache = data.positions.map(p => ({
            id: Number(p.id),
            name: p.name
        }));

        document.querySelectorAll(".position-select").forEach(select => {
            select.innerHTML = "";
            positionsCache.forEach(pos => {
                const opt = document.createElement("option");
                opt.value = pos.id;
                opt.textContent = pos.name;
                select.appendChild(opt);
            });
        });

    } catch (err) {
        console.error("❌ Errore nel caricamento di positions.json:", err);
        positionsCache = [];
        toastpopup("Errore durante il caricamento delle posizioni", "danger");
    }
}

async function loadPaymentMethods() {
    try {
        const res = await apiGet(`/config/paymentsMethods.json`);
        if (!res.success) {
            console.error("Errore nel caricamento dei metodi di pagamento:", res.error);
            await toastpopup("Errore nel caricamento dei metodi di pagamento: " + res.error, "danger");
            paymentMethods = {};
            return paymentMethods;
        }

        paymentMethods = res.data || {};
        console.log("✔ Metodi di pagamento caricati:", paymentMethods);
        return paymentMethods;

    } catch (err) {
        console.error("❌ Errore nel caricamento di payments.json:", err);
        paymentMethods = {};
        await toastpopup("Errore durante il caricamento dei metodi di pagamento", "danger");
        return paymentMethods;
    }
}

function translatePaymentMethod(methodId) {
    if (methodId === null || methodId === undefined) return "";
    if (!paymentMethods) return String(methodId);

    const key = String(methodId);
    const info = paymentMethods[key];
    if (!info) return String(methodId);

    return info.label || String(methodId);
}

async function loadClientTags() {
    try {
        const res = await apiGet(`/config/clientTags.json`);
        if (!res.success) {
            console.error("Errore nel caricamento dei tag:", res.error);
            await toastpopup("Errore nel caricamento dei tag: " + res.error, "danger");
            tags = {};
            return tags;
        }

        tags = res.data || {};
        console.log("✔ Tag caricati:", tags);
        return tags;
    } catch (err) {
        console.error("❌ Errore nel caricamento di clientTags.json:", err);
        tags = {};
        await toastpopup("Errore durante il caricamento dei tag", "danger");
        return tags;
    }
}

function translateClientTags(tagId) {
    if (tagId === null || tagId === undefined) return null;

    const numericId = Number(tagId);
    if (!Number.isFinite(numericId) || numericId === 0) {
        return null;
    }

    if (!tags) return null;

    const key  = String(numericId);
    const info = tags[key];
    if (!info) return null;

    return {
        label: info.label || String(numericId),
        color: info.color || "#6c757d"
    };
}

function renderClientTagBadge(tagId) {
    const tagInfo = translateClientTags(tagId);
    if (!tagInfo) return "";

    const safeLabel = escapeHtml(tagInfo.label);
    const safeColor = escapeHtml(tagInfo.color);

    return `
        <span class="badge me-1"
              style="background-color: ${safeColor}; color: #fff;">
            ${safeLabel}
        </span>
    `;
}

async function loadCount(path, selector, logKey, errorLabel) {
    try {
        const res = await apiGet(path);
        if (!res.success) {
            console.error(`Errore nel caricamento ${errorLabel}:`, res.error);
            return;
        }

        document.querySelectorAll(selector).forEach(el => {
            console.log(`Imposto ${logKey} a`, res.data);
            el.classList.remove("placeholder");
            el.textContent = String(res.data);
        });
    } catch (err) {
        console.error(`❌ Errore nel caricamento ${errorLabel}:`, err);
    }
}

async function loadAllOrderCounts() {
    await Promise.all([
        loadCount(
            `/orders/ordersCount`,
            `.orderCount`,
            "orderCount",
            "del conteggio ordini"
        ),
        loadCount(
            `/orders/problemCount`,
            `.problemCount`,
            "problemCount",
            "del conteggio ordini in problema"
        ),
        loadCount(
            `/orders/toShipCount`,
            `.toShipCount`,
            "toShipCount",
            "del conteggio ordini da spedire"
        ),
        loadCount(
            `/orders/waitingForProductsCount`,
            `.waitingForProducts`,
            "waitingForProducts",
            "del conteggio ordini in attesa di prodotti"
        )
    ]);
}

function translatePosition(positionId) {
    const pos = positionsCache?.find(p => p.id === Number(positionId));
    return pos ? pos.name : "Unknown";
}

async function loadPositionsIfNeeded() {
    if (!positionsCache) {
        await loadPositions();
    }
}

async function fetchOrders({
    page    = 0,
    status  = null,
    sortBy  = "creationDate",
    sortDir = "desc"
} = {}) {
    const pageSize = ordersPageSize || 20;

    const params = new URLSearchParams({
        page: String(page),
        sort_by: sortBy,
        sort_dir: sortDir,
        page_size: String(pageSize),
    });

    if (status !== null && status !== undefined && status !== "") {
        params.append("status", String(status));
    }

    const res = await apiGet(`/orders?` + params.toString());
    if (!res.success) {
        await toastpopup("Errore nel caricamento degli ordini: " + res.error, "danger");
        return { success: false, data: [], error: res.error };
    }

    console.log("Ordini caricati:", res.data);
    res.data.forEach(o => console.log("order.id =", o.id));

    return res;
}

async function loadOrdersPage(page = 0) {
    if (page < 0) return;

    const res = await fetchOrders({
        page,
        status: currentStatusFilter,
        sortBy: currentSortBy,
        sortDir: currentSortDir,
    });

    if (!res.success) {
        console.error("Errore dal server:", res.error);
        await toastpopup("Errore nel caricamento degli ordini.", "danger");
        return;
    }

    const rows = res.data || [];

    // Se provo ad andare oltre l'ultima pagina, resto dove sono
    if (rows.length === 0 && page > 0 && page > currentPage) {
        await toastpopup("Sei già all'ultima pagina.", "info");
        // disabilito "Successiva" perché non ci sono altre righe
        renderOrdersPagination(currentPage, 0);
        return;
    }

    currentPage = page;
    renderOrders(res, currentPage);
    await loadStatuses();
}

function renderOrdersPagination(currentPage, receivedRowsCount) {
    const pagination = document.getElementById("ordersPagination");
    if (!pagination) return;

    // Prev c'è solo da pagina 1 in su
    const hasPrev = currentPage > 0;
    // Se nell’ultima fetch ho ricevuto almeno 1 riga, posso *provare* ad andare avanti
    // (se non ci saranno altre righe, lo capisco nella chiamata successiva)
    const hasNext = receivedRowsCount > 0;

    pagination.classList.remove("d-none");

    pagination.innerHTML = `
        <li class="page-item ${hasPrev ? "" : "disabled"}">
            <a class="page-link rounded-pill shadow-sm d-flex align-items-center gap-1"
               href="#"
               data-page-action="prev"
               aria-label="Pagina precedente">
                <i class="bi bi-chevron-left"></i>
                <span class="d-none d-sm-inline">Precedente</span>
            </a>
        </li>

        <li class="page-item disabled">
            <span class="page-link rounded-pill bg-light border-0 text-secondary fw-semibold">
                Pagina ${currentPage + 1}
            </span>
        </li>

        <li class="page-item ${hasNext ? "" : "disabled"}">
            <a class="page-link rounded-pill shadow-sm d-flex align-items-center gap-1"
               href="#"
               data-page-action="next"
               aria-label="Pagina successiva">
                <span class="d-none d-sm-inline">Successiva</span>
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
}

function initPaginationHandlers() {
    const pagination = document.getElementById("ordersPagination");
    if (!pagination) return;

    pagination.addEventListener("click", (e) => {
        const link = e.target.closest("a[data-page-action]");
        if (!link) return;
        e.preventDefault();

        const action = link.dataset.pageAction;

        if (action === "prev") {
            if (currentPage > 0) {
                loadOrdersPage(currentPage - 1);
            }
        } else if (action === "next") {
            // Provo sempre a caricare la pagina successiva.
            // Se non esiste, loadOrdersPage mostrerà il toast "Sei già all'ultima pagina"
            loadOrdersPage(currentPage + 1);
        }
    });
}

function renderOrders(response, page) {
    const tableBody = document.getElementById("orderTable");
    if (!tableBody) return;

    ordersById = {};
    tableBody.innerHTML = "";

    const pagination = document.getElementById("ordersPagination");

    if (!response.success) {
        if (pagination) {
            pagination.innerHTML = "";
            pagination.classList.add("d-none");
        }
        toastpopup("Errore nel caricamento degli ordini.", "danger");
        return;
    }

    if (!response.data || response.data.length === 0) {
        if (pagination) {
            pagination.innerHTML = "";
            pagination.classList.add("d-none");
        }
        return;
    }

    response.data.forEach(order => {
        ordersById[order.id] = order;
        addOrderRow(order);
    });

    renderOrdersPagination(page, response.data.length);
}

function updateDirToggleUi(button) {
    const dir   = button.dataset.dir === "asc" ? "asc" : "desc";
    const icon  = button.querySelector("i");
    const label = button.querySelector("span");

    if (dir === "asc") {
        if (icon) {
            icon.classList.remove("bi-sort-down-alt");
            icon.classList.add("bi-sort-up-alt");
        }
        if (label) label.textContent = "Ascendente";
    } else {
        if (icon) {
            icon.classList.remove("bi-sort-up-alt");
            icon.classList.add("bi-sort-down-alt");
        }
        if (label) label.textContent = "Discendente";
    }
}

function setupSortBar() {
    const fieldSelect = document.getElementById("orderSortField");
    const dirSelect   = document.getElementById("orderSortDir");
    const applyBtn    = document.getElementById("orderSortApply");
    const resetBtn    = document.getElementById("orderSortReset");

    if (!fieldSelect || !dirSelect || !applyBtn || !resetBtn) {
        console.warn("⚠ Controlli sort non trovati (barra di ordinamento non presente)");
        return;
    }

    async function applySort() {
        currentSortBy  = fieldSelect.value || "creationDate";
        currentSortDir = (dirSelect.value === "asc") ? "asc" : "desc";
        await loadOrdersPage(0);
    }

    async function resetSort() {
        currentSortBy  = "creationDate";
        currentSortDir = "desc";

        fieldSelect.value = "creationDate";
        dirSelect.value   = "desc";

        await loadOrdersPage(0);
    }

    applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        applySort();
    });

    resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        resetSort();
    });
}

function addOrderRow(order) {
    const tableBody = document.querySelector("#orderTable");

    const row = document.createElement("tr");
    row.classList.add("order-row");
    row.dataset.orderId = String(order.id);

    row.innerHTML = `
        <td>${escapeHtml(order.id)}</td>
        <td>${renderClientTagBadge(order.tag)}${escapeHtml(order.name)}</td>
        <td>${escapeHtml(order.platform)}</td>
        <td>${escapeHtml(translatePaymentMethod(order.paymentMethod))}</td>
        <td>${escapeHtml(order.customerHandle)}</td>
        <td>${formatDateTime(escapeHtml(order.creationDate))}</td>
        <td>${formatDateTime(escapeHtml(order.lastModified))}</td>
        <td class="text-end">
            ${
                order.orderTotal !== null && order.orderTotal !== undefined
                    ? `${Number(order.orderTotal).toFixed(2)}€`
                    : "-"
            }
        </td>
        <td>
            <div class="dropdown position-relative" style="pointer-events: auto;">
                <button class="btn btn-sm dropdown-toggle status-btn" type="button"
                    data-bs-toggle="dropdown"
                    data-current-status="${escapeHtml(order.status)}">
                    <span class="badge bg-warning">${escapeHtml(order.status)}</span>
                </button>
                <ul class="dropdown-menu status-menu"></ul>
            </div>
        </td>
    `;

    const details = document.createElement("tr");
    details.classList.add("order-details");
    details.dataset.orderId = String(order.id);

    details.innerHTML = `
    <td colspan="9" class="p-0">
        <div class="detail-wrapper">
            <div class="detail-content p-3 bg-white border rounded shadow-sm">
                <table class="table table-sm align-middle mb-3">
                    <thead class="table-light">
                        <tr>
                            <th>Prodotto</th>
                            <th>SKU</th>
                            <th class="text-center">Qtà</th>
                            <th class="text-end">Prezzo</th>
                            <th class="text-end">Totale</th>
                            <th class="text-center">Posizione</th>
                        </tr>
                    </thead>

                    <tbody id="products-${order.id}">
                        ${
                            Array(Number(order.productCount) || 1).fill(0).map(() => `
                            <tr class="product-placeholder-row placeholder-glow">
                                <td><span class="placeholder col-8"></span></td>
                                <td><span class="placeholder col-4"></span></td>
                                <td class="text-center"><span class="placeholder col-3"></span></td>
                                <td class="text-end"><span class="placeholder col-4"></span></td>
                                <td class="text-end"><span class="placeholder col-4"></span></td>
                                <td class="text-center"><span class="placeholder col-6"></span></td>
                            </tr>
                            `).join("")
                        }
                    </tbody>
                </table>

                <table class="table table-sm mb-4">
                    <tbody>
                        <tr>
                            <th class="w-50">Totale prodotti</th>
                            <td class="text-end fw-bold" id="order-total-${order.id}">
                                <span class="placeholder col-4"></span>
                            </td>
                        </tr>
                        <tr>
                            <th>Spedizione</th>
                            <td class="text-end" id="order-shipping-${order.id}">
                                <span class="placeholder col-4"></span>
                            </td>
                        </tr>
                        <tr>
                            <th>Codice sconto</th>
                            <td class="text-end" id="order-discount-${order.id}">
                                <span class="placeholder col-4"></span>
                            </td>
                        </tr>
                        <tr class="table-light">
                            <th class="fw-bold">Totale pagato</th>
                            <td class="text-end fw-bold" id="order-paid-${order.id}">
                                <span class="placeholder col-4"></span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="mt-3">
                    <label class="fw-bold mb-2">Note libere</label>
                    <textarea class="form-control order-note-input" rows="1" placeholder="Scrivi una nota..."></textarea>
                    <button class="btn btn-primary btn-sm mt-2 add-note-btn" data-orderid="${order.id}">
                        Aggiungi nota
                    </button>
                </div>

                <hr class="my-4">

                <div>
                    <div class="fw-bold mb-2">Storico note</div>
                    <ul class="list-group note-timeline" id="note-timeline-${order.id}">
                        <li class="list-group-item placeholder-glow">
                            <div class="placeholder col-10 mb-2"></div>
                            <div class="placeholder col-4"></div>
                        </li>
                        <li class="list-group-item placeholder-glow">
                            <div class="placeholder col-8 mb-2"></div>
                            <div class="placeholder col-3"></div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </td>
    `;

    tableBody.appendChild(row);
    tableBody.appendChild(details);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const tableBodyEl = document.getElementById("orderTable");
        if (tableBodyEl && tableBodyEl.dataset.pageSize) {
            const parsed = parseInt(tableBodyEl.dataset.pageSize, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                ordersPageSize = parsed;
                console.log("ordersPageSize from DOM:", ordersPageSize);
            }
        }

        currentPage         = 0;
        currentStatusFilter = null;
        currentSortBy       = "creationDate";
        currentSortDir      = "desc";

        await Promise.all([
            loadPositionsIfNeeded(),
            loadAllOrderCounts(),
            loadClientTags(),
            loadPaymentMethods()
        ]);

        // primo load
        await loadOrdersPage(0);

        toggleDetails();
        initPaginationHandlers();
        setupSortBar();

        // card di filtro in alto (problemi, da spedire, ecc.)
        document.querySelectorAll(".order-filter-card").forEach(card => {
            card.addEventListener("click", async () => {
                const raw = card.getAttribute("data-status-filter");

                if (raw === "" || raw === null || raw === undefined) {
                    currentStatusFilter = null;
                } else {
                    const parsed = Number(raw);
                    currentStatusFilter = Number.isFinite(parsed) ? parsed : null;
                }

                console.log("Filtro per stato:", currentStatusFilter);

                await loadOrdersPage(0);
            });
        });

    } catch (err) {
        console.error("Errore inatteso durante l'inizializzazione ordini:", err);
        toastpopup("Errore imprevisto durante il caricamento degli ordini.", "danger");
    }
});

function toggleDetails() {
    const tableBody = document.getElementById("orderTable");
    if (!tableBody) return;

    tableBody.addEventListener("click", async (e) => {
        const row = e.target.closest("tr.order-row");
        if (!row) return;

        if (e.target.closest(".dropdown")) return;

        const orderId = row.dataset.orderId;
        if (!orderId) {
            console.error("❌ order-row senza data-order-id");
            return;
        }

        const details = row.nextElementSibling;
        if (!details || !details.classList.contains("order-details")) {
            console.error("❌ Riga dettagli non trovata per ordine", orderId, details);
            return;
        }

        const wrapper = details.querySelector(".detail-wrapper");
        if (!wrapper) {
            console.error("❌ detail-wrapper mancante per ordine", orderId);
            return;
        }

        const wasOpen = wrapper.classList.contains("open");

        document
            .querySelectorAll(".order-details .detail-wrapper.open")
            .forEach(w => w.classList.remove("open"));

        if (wasOpen) {
            return;
        }

        wrapper.classList.add("open");

        try {
            await loadPositionsIfNeeded();

            const [productsRes, notesRes] = await Promise.all([
                apiGet(`/orders/${orderId}/products`),
                apiGet(`/orders/${orderId}/notes`)
            ]);

            if (!productsRes.success) {
                console.error("Errore nel caricamento prodotti:", productsRes.error);
                await toastpopup("Errore nel caricamento prodotti: " + productsRes.error, "danger");
                return;
            }
            if (!notesRes.success) {
                console.error("Errore nel caricamento note:", notesRes.error);
                await toastpopup("Errore nel caricamento note: " + notesRes.error, "danger");
                return;
            }

            const tbody = wrapper.querySelector(`#products-${orderId}`);
            if (tbody) {
                tbody.innerHTML = productsRes.data.map(p => `
                    <tr>
                        <td>${escapeHtml(p.productName)}</td>
                        <td>${escapeHtml(p.sku)}</td>
                        <td class="text-center">${p.quantity}</td>
                        <td class="text-end">${Number(p.price).toFixed(2)}€</td>
                        <td class="text-end fw-bold">${(p.price * p.quantity).toFixed(2)}€</td>
                        <td class="text-center">${escapeHtml(translatePosition(p.positionId))}</td>
                    </tr>
                `).join("");
            }

            const totalElem    = wrapper.querySelector(`#order-total-${orderId}`);
            const shippingElem = wrapper.querySelector(`#order-shipping-${orderId}`);
            const discountElem = wrapper.querySelector(`#order-discount-${orderId}`);
            const paidElem     = wrapper.querySelector(`#order-paid-${orderId}`);

            const orderData  = ordersById[orderId];
            const orderTotal = productsRes.data.reduce(
                (sum, p) => sum + (Number(p.price) * Number(p.quantity)),
                0
            );
            const shipping = Number(orderData?.shippingPrice ?? 0);
            const discount = Number(orderData?.discountAmount ?? 0);
            const totalPaid = orderTotal + shipping - discount;

            if (totalElem)    totalElem.textContent    = `${orderTotal.toFixed(2)}€`;
            if (shippingElem) shippingElem.textContent = `${shipping.toFixed(2)}€`;
            if (discountElem) discountElem.textContent = `${discount.toFixed(2)}€`;
            if (paidElem)     paidElem.textContent     = `${totalPaid.toFixed(2)}€`;

            const noteList = wrapper.querySelector(".note-timeline");
            if (noteList) {
                noteList.innerHTML = notesRes.data.map(note => `
                    <li class="list-group-item border-0 px-0">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <div class="d-flex align-items-center">
                                <span class="badge rounded-pill text-bg-primary me-2">
                                    ${escapeHtml(note.addedBy)}
                                </span>
                                <small class="text-muted">
                                    ${escapeHtml(formatDateTime(note.createdAt))}
                                </small>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link text-muted p-0" type="button"
                                        data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <button class="dropdown-item note-delete-btn" type="button" data-noteid="${note.id}">
                                        <button class="dropdown-item note-delete-btn" type="button" data-noteid="${note.id}">
                                            Elimina
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div class="ps-1 text-body">
                            ${escapeHtml(note.note)}
                        </div>
                    </li>
                `).join("");

                setupNoteHandlers(wrapper, orderId);
            }

        } catch (err) {
            console.error("Errore nel caricamento dettagli:", err);
            await toastpopup("Errore imprevisto nel caricamento dei dettagli ordine", "danger");
        }
    });
}

function setupNoteHandlers(wrapper, orderId) {
    const noteList = wrapper.querySelector(".note-timeline");
    const addBtn   = wrapper.querySelector(".add-note-btn");
    const textarea = wrapper.querySelector(".order-note-input");

    if (!noteList || !addBtn || !textarea) {
        console.warn("⚠ Impossibile trovare elementi note per ordine", orderId);
        return;
    }

    addBtn.onclick = async (e) => {
        e.preventDefault();

        const noteText = textarea.value.trim();
        if (!noteText) return;

        const userElement = document.querySelector(".username");
        if (!userElement) {
            await toastpopup("Utente non identificato", "danger");
            return;
        }

        const addedBy = userElement.textContent.trim();

        const addNoteRes = await apiPost(`/orders/${orderId}/addNotes`, {
            note: noteText,
            addedBy: addedBy
        });

        if (!addNoteRes.success) {
            await toastpopup("Errore nell'aggiunta della nota: " + addNoteRes.error, "danger");
            return;
        }

        const newNote = addNoteRes.data;
        await toastpopup("Nota aggiunta con successo!", "success");
        textarea.value = "";

        const displayAddedBy   = newNote.addedby ?? newNote.addedBy ?? addedBy;
        const displayCreatedAt = newNote.createdat ?? newNote.createdAt ?? new Date().toISOString();

        const li = document.createElement("li");
        li.className = "list-group-item border-0 px-0";
        li.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-1">
                <div class="d-flex align-items-center">
                    <span class="badge rounded-pill text-bg-primary me-2">
                        ${escapeHtml(displayAddedBy)}
                    </span>
                    <small class="text-muted">
                        ${escapeHtml(formatDateTime(displayCreatedAt))}
                    </small>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-link text-muted p-0" type="button"
                            data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <button class="dropdown-item note-delete-btn" type="button" data-noteid="${newNote.id}">
                                Elimina
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="ps-1 text-body">
                ${escapeHtml(newNote.note)}
            </div>
        `;

        noteList.prepend(li);

        const deleteBtn = li.querySelector(".note-delete-btn");
        if (deleteBtn) {
            deleteBtn.onclick = async (ev) => {
                ev.preventDefault();
                const noteId = deleteBtn.dataset.noteid;
                const deleteRes = await apiDelete(`/orders/${orderId}/deleteNote/${noteId}`);
                if (!deleteRes.success) {
                    await toastpopup("Errore nella cancellazione della nota: " + deleteRes.error, "danger");
                    return;
                }
                await toastpopup("Nota eliminata con successo!", "success");
                li.remove();
            };
        }
    };

    noteList.querySelectorAll(".note-delete-btn").forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const noteId = btn.dataset.noteid;
            const li = btn.closest(".list-group-item");
            const deleteRes = await apiDelete(`/orders/${orderId}/deleteNote/${noteId}`);
            if (!deleteRes.success) {
                await toastpopup("Errore nella cancellazione della nota: " + deleteRes.error, "danger");
                return;
            }
            await toastpopup("Nota eliminata con successo!", "success");
            if (li) li.remove();
        };
    });
}

async function updateStatusButton(button, statusId, statusInfo) {
    const currentId = Number(button.dataset.currentStatus || 0);
    const nextId    = Number(statusId);

    if (currentId === nextId) return;

    const orderRow = button.closest("tr");
    const orderId  = orderRow.children[0].textContent.trim();

    const res = await apiPost(`/orders/updateStatus/${orderId}`, { newStatus: nextId });
    if (!res.success) {
        await toastpopup("Errore nell'aggiornamento dello stato: " + res.error, "danger");
        return;
    }

    // incrementi
    if (nextId === 6) {
        const el = document.querySelectorAll(".problemCount");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount + 1);
        });
    } else if (nextId === 7) {
        const el = document.querySelectorAll(".toShipCount");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount + 1);
        });
    } else if (nextId === 2) {
        const el = document.querySelectorAll(".waitingForProducts");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount + 1);
        });
    }

    // decrementi
    if (currentId === 6) {
        const el = document.querySelectorAll(".problemCount");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount - 1);
        });
    } else if (currentId === 7) {
        const el = document.querySelectorAll(".toShipCount");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount - 1);
        });
    } else if (currentId === 2) {
        const el = document.querySelectorAll(".waitingForProducts");
        el.forEach(elem => {
            let currentCount = parseInt(elem.textContent) || 0;
            elem.textContent = String(currentCount - 1);
        });
    }

    toastpopup("Stato aggiornato con successo!", "success");
    button.innerHTML =
        `<span class="badge" style="background-color: ${statusInfo.color}; color: #fff;">${statusInfo.label}</span>`;
    button.dataset.currentStatus = String(nextId);
}


