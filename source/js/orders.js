let positionsCache = null;

async function loadStatuses() {
    const res = await fetch("http://127.0.0.1:5500/source/src/status.json");
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
}

async function loadPositions() {
    try {
        const res = await fetch("http://127.0.0.1:5500/source/src/positions.json");
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

async function fetchOrders(page) {
    if (page === undefined) page = 0;
    try {
        const response = await fetch(`http://127.0.0.1:8000/orders/getOrders?start=${page}`);
        const orders = await response.json();
        console.log("Ordini caricati:", orders);
        return orders;
    } catch (error) {
        console.error("Errore nel caricamento degli ordini:", error);
        return [];
    }
}

function addOrderRow(order) {
    const tableBody = document.querySelector("#orderTable");

    const row = document.createElement("tr");
    row.classList.add("order-row");
    row.innerHTML = `
        <td>${order.id}</td>
        <td>${order.name}</td>
        <td>${order.platform}</td>
        <td>${order.customerHandle}</td>
        <td>${order.creationDate}</td>
        <td>${order.lastModified}</td>
        <td>
            <div class="dropdown position-relative" style="pointer-events: auto;">
                <button class="btn btn-sm dropdown-toggle status-btn" type="button"
                    data-bs-toggle="dropdown" data-current-status="${order.status}" position-relative>
                    <span class="badge bg-warning">${order.status}</span>
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
                            Array(Number(order.product) || 1).fill(0).map(() => `
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


document.addEventListener("DOMContentLoaded", () =>
    fetchOrders(0).then(response => {
        if (!response.success) {
            console.error("Errore dal server:", response.error);
            return;
        }
        response.data.forEach(order => addOrderRow(order));
        toggleDetails();      // <<== Qui dentro, dopo aver aggiunto righe
        loadStatuses();
    })
);

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
                        fetch(`http://localhost:8000/orders/getOrderProducts/${orderId}`).then(r => r.json()),
                        fetch(`http://localhost:8000/orders/getOrderNotes/${orderId}`).then(r => r.json())
                    ]);

                    if (!productsRes.success) {
                        console.error("Errore nel caricamento prodotti:", productsRes.error);
                        return;
                    }

                    if (!notesRes.success) {
                        console.error("Errore nel caricamento note:", notesRes.error);
                        return;
                    }

                    const tbody = document.getElementById(`products-${orderId}`);
                    tbody.innerHTML = productsRes.data.map(p => `
                        <tr>
                            <td>${p.productName}</td>
                            <td>${p.sku}</td>
                            <td class="text-center">${p.quantity}</td>
                            <td class="text-end">${Number(p.price).toFixed(2)}€</td>
                            <td class="text-end fw-bold">${(p.price * p.quantity).toFixed(2)}€</td>
                            <td class="text-center">${translatePosition(p.positionId)}</td>
                        </tr>
                    `).join("");

                    const noteList = wrapper.querySelector(".note-timeline");
                    noteList.innerHTML = notesRes.data.map(note => `
                        <li class="list-group-item d-flex justify-content-between align-items-start">
                            <div class="me-auto">
                                <div class="fw-semibold">${note.note}</div>
                                <small class="text-muted">${note.createdAt}</small>
                            </div>
                            <span class="badge text-bg-primary rounded-pill">${note.addedBy}</span>
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
                li.classList.add("list-group-item");
                li.innerHTML = `
                    <div class="note-author">${user}</div>
                    <div class="note-text">${text}</div>
                    <div class="note-time">${now}</div>
                `;
                list.prepend(li);
                textarea.value = "";
            });
        });
    }
    initNoteSystem();
});
