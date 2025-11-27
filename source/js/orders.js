let positionsCache = null;

async function toastpopup(message, type="info", duration=3000) {
    console.log({"todo" : "toastpopup"}); // placeholder
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
        return String(value); // fallback se qualcosa va storto
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

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE_URL}${path}`);

        let payload;
        try {
            payload = await res.json();
        } catch (e) {
            console.error(`❌ Risposta non JSON da ${path}`, e);
            return {
                success: false,
                data: null,
                error: "Risposta non valida dal server"
            };
        }

        // Se la risposta HTTP non è ok o success è false, normalizziamo l'errore
        if (!res.ok || !payload.success) {
            console.error(
                `❌ Errore API su ${path}:`,
                payload.error || res.statusText
            );
            return {
                success: false,
                data: null,
                error: payload.error || `Errore HTTP ${res.status}`
            };
        }

        // Caso ok: garantiamo sempre { success, data, error }
        return {
            success: true,
            data: payload.data ?? null,
            error: null
        };

    } catch (err) {
        console.error(`❌ Errore di rete chiamando ${path}:`, err);
        return {
            success: false,
            data: null,
            error: "Errore di rete durante la chiamata al server"
        };
    }
}

async function loadStatuses() {
    const res = await fetch(`${STATIC_BASE_URL}/src/status.json`);
    const statuses = await res.json();

    document.querySelectorAll(".status-btn").forEach(button => {
        const menu = button.parentElement.querySelector(".status-menu");

        statuses.forEach(status => {
            const li = document.createElement("li");
            li.innerHTML = `
                <a class="dropdown-item" data-status="${status.id}" href="#">
                    <span class="badge bg-${status.color}">${status.label}</span>
                </a>`;
            menu.appendChild(li);
        });

        menu.addEventListener("click", e => {
            const a = e.target.closest("a");
            if (!a) return;

            const id = a.dataset.status;
            const info = statuses.find(s => s.id === id);

            button.innerHTML =
                `<span class="badge bg-${info.color}">${info.label}</span>`;

            button.dataset.currentStatus = id;
        });
    });
};

async function loadPositions() {
    try {
        const res = await fetch(`${STATIC_BASE_URL}/src/positions.json`);
        const data = await res.json();

        // normalizza id come Number
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
        console.log("✔ Posizioni caricate:", positionsCache);
    } catch (err) {
        console.error("❌ Errore nel caricamento di positions.json:", err);
        positionsCache = [];
    }
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

async function fetchOrders(page = 0) {
    const res = await apiGet(`/orders?page=${page}`);
    if (!res.success) {
        await toastpopup("Errore nel caricamento degli ordini: " + res.error, "error");
        return { success: false, data: [], error: res.error };
    }
    console.log("Ordini caricati:", res.data);
    return res;
}

function addOrderRow(order) {
    const tableBody = document.querySelector("#orderTable");

    const row = document.createElement("tr");
    row.classList.add("order-row");
    row.innerHTML = `
        <td>${escapeHtml(order.id)}</td>
        <td>${escapeHtml(order.name)}</td>
        <td>${escapeHtml(order.platform)}</td>
        <td>${escapeHtml(order.customerHandle)}</td>
        <td>${escapeHtml(order.creationDate)}</td>
        <td>${escapeHtml(order.lastModified)}</td>
        <td>
            <div class="dropdown position-relative" style="pointer-events: auto;">
                <button class="btn btn-sm dropdown-toggle status-btn" type="button"
                    data-bs-toggle="dropdown" data-current-status="${escapeHtml(order.status)}" position-relative>
                    <span class="badge bg-warning">${escapeHtml(order.status)}</span>
                </button>
                <ul class="dropdown-menu status-menu"></ul>
            </div>
        </td>`;

    // DETTAGLI ORDINE
    const details = document.createElement("tr");
    details.classList.add("order-details");
    details.innerHTML = `
    <td colspan="8" class="p-0">
        <div class="detail-wrapper">
            <div class="detail-content p-3 bg-white border rounded shadow-sm">

                <div class="fw-bold mb-2">Prodotti dell’ordine #${order.id}</div>

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

                <div class="mt-3">
                    <label class="fw-bold mb-2">Note libere</label>
                    <textarea class="form-control order-note-input" rows="3" placeholder="Scrivi una nota..."></textarea>
                    <button class="btn btn-primary btn-sm mt-2 add-note-btn" data-orderid="${order.id}">Aggiungi nota</button>
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

    tableBody.appendChild(row); tableBody.appendChild(details);
}

// carica la lista dei magazzini all'avvio
document.addEventListener("DOMContentLoaded", loadPositions);


document.addEventListener("DOMContentLoaded", () => {
    fetchOrders(0)
        .then(response => {
            if (!response.success) {
                console.error("Errore dal server:", response.error);
                showOrdersTableMessage("Errore nel caricamento degli ordini.");
                return;
            }

            if (!response.data || response.data.length === 0) {
                showOrdersTableMessage("Nessun ordine trovato.");
                return;
            }

            response.data.forEach(order => addOrderRow(order));

            // inizializzo solo se ho realmente popolato la tabella
            toggleDetails();
            loadStatuses();
        })
        .catch(err => {
            console.error("Errore inatteso durante l'inizializzazione ordini:", err);
            showOrdersTableMessage("Errore imprevisto durante il caricamento degli ordini.");
        });
});

function toggleDetails() {
    document.querySelectorAll(".order-row").forEach(row => {
        row.addEventListener("click", async (e) => {

            if (e.target.closest(".dropdown")) return;

            const details = row.nextElementSibling;
            const wrapper = details.querySelector(".detail-wrapper");

            const isOpening = !wrapper.classList.contains("open");
            wrapper.classList.toggle("open");

            if (isOpening && !wrapper.classList.contains("hasLoadedProducts")) {

                const orderId = row.children[0].textContent.trim();
                console.log("Caricamento prodotti per ordine #" + orderId);

                try {
                    await loadPositionsIfNeeded();  // assicurati che positionsCache sia valorizzato

                    const [productsRes, notesRes] = await Promise.all([
                        apiGet(`/orders/${orderId}/products`),
                        apiGet(`/orders/${orderId}/notes`)
                    ]);

                    if (!productsRes.success) {
                        console.error("Errore nel caricamento prodotti:", productsRes.error);
                        return;
                    }

                    if (!notesRes.success) {
                        console.error("Errore nel caricamento note:", notesRes.error);
                        return;
                    }

                    // Prodotti
                    const tbody = document.getElementById(`products-${orderId}`);
                    tbody.innerHTML = productsRes.data.map(p => `
                        <tr>
                            <td>${escapeHtml(p.productName)}</td>
                            <td>${escapeHtml(p.sku)}</td>
                            <td class="text-center">${p.quantity}</td>
                            <td class="text-end">${Number(p.price).toFixed(2)}€</td>
                            <td class="text-end fw-bold">${(p.price * p.quantity).toFixed(2)}€</td>
                            <td class="text-center">${escapeHtml(p.positionId)}</td>
                        </tr>
                    `).join("");

                    // Note
                    const noteList = wrapper.querySelector(".note-timeline");
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
                                        <li><button class="dropdown-item note-edit-btn" type="button">Modifica</button></li>
                                        <li><button class="dropdown-item note-delete-btn" type="button">Elimina</button></li>
                                    </ul>
                                </div>
                            </div>
                            <div class="ps-1 text-body">
                                ${escapeHtml(note.note)}
                            </div>
                        </li>
                    `).join("");

                    wrapper.classList.add("hasLoadedProducts");
                } catch (err) {
                    console.error("Errore nel caricamento dettagli:", err);
                }
            }
        });
    });
}

//notes system
document.addEventListener("DOMContentLoaded", () => {
    function initNoteSystem() {
        document.querySelectorAll(".add-note-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const wrapper = btn.closest(".detail-content");

                const textarea = wrapper.querySelector(".order-note-input");
                const list = wrapper.querySelector(".note-timeline");

                const text = textarea.value.trim();
                if (text === "") return;

                const user = document.querySelector(".username").textContent.trim();
                const now = new Date().toLocaleString("it-IT");

                const li = document.createElement("li");
                li.className = "list-group-item border-0 px-0";
                li.innerHTML = `
                    <div class="d-flex align-items-center justify-content-between mb-1">
                        <div class="d-flex align-items-center">
                            <span class="badge rounded-pill text-bg-primary me-2">
                                ${escapeHtml(user)}
                            </span>
                            <small class="text-muted">
                                ${escapeHtml(now)}
                            </small>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-link text-muted p-0" type="button"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><button class="dropdown-item note-edit-btn" type="button">Modifica</button></li>
                                <li><button class="dropdown-item note-delete-btn" type="button">Elimina</button></li>
                            </ul>
                        </div>
                    </div>
                    <div class="ps-1 text-body">
                        ${escapeHtml(text)}
                    </div>
                `;
                list.prepend(li);
                textarea.value = "";
            });
        });
    }
    initNoteSystem();
});
