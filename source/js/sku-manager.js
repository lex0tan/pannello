document.addEventListener("DOMContentLoaded", () => {
    const label = document.getElementById("skuPageSizeLabel");

    document.querySelectorAll(".sku-page-size").forEach(btn => {
        btn.addEventListener("click", async () => {
            const size = Number(btn.dataset.size || 50);
            label.textContent = String(size);
        });
    });
});

async function fetchTotalProducts() {
    try {
        apiGet("/products/total").then(response => {
            if (response.success && response.success === true) {
                const totalCount = response.data?.total_count ?? 0;
                let element = document.getElementById("sku-total-products");
                if (element) {
                    element.textContent = totalCount; element.classList.remove("placeholder");
                } else { toastpopup(`Total products count fetched: ${totalCount}`, "success") }
            } else { toastpopup("Failed to fetch total products count:", response.error) }
        });
    }
    catch (error) {
        toastpopup("Error fetching total products count:", error);
    }
}

async function fetchUnderStock() {
    try {
        apiGet("/products/understock").then(response => {
            if (response.success && response.success === true) {
                const understockCount = response.data?.understock_count ?? 0;
                let element = document.getElementById("sku-understock-products");
                if (element) {
                    element.textContent = understockCount; element.classList.remove("placeholder");
                }
                else {
                    toastpopup(`Understock products count fetched: ${understockCount} placeholder not found`, "error");
                }
            }
        })
    }
    catch (error) {
        toastpopup("Error fetching understock products count:", error);
    }
}

function loadExport() {
    const exportBtn = document.getElementById("skuExportBtn");
    if (exportBtn) {
        exportBtn.onclick = async function () {
            table = document.getElementById("productTableBody");
            if (!table) { toastpopup("Product table not found", "danger"); return; }
            if (table.rows.length === 0) { toastpopup("Nessun dato da esportare", "danger"); return; }
            toastpopup("TODO esportazione table", "info");
            const sort = getSkuSortParams();

                await fetch("/products/export",{
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        limit: parseInt(document.getElementById("skuPageSizeLabel").textContent) || 50,
                        lookup: document.getElementById("skuSearchInput").value.trim(),

                        brand: selectValueToNullableInt("brandFilter"),
                        category: selectValueToNullableInt("categoryFilter"),
                        supplier: selectValueToNullableInt("supplierFilter"),
                        status: selectValueToNullableInt("statusFilter"),

                        understock: !!document.getElementById("onlyUnderMinStock").checked,

                        sort_by: sort.sort_by,
                        sort_dir: sort.sort_dir,

                        export_format: "csv"
                    })
                }).then(response => {
                if (response.status === 200) {
                    response.blob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = "products_export.csv";
                        document.body.appendChild(a); a.click(); a.remove();
                        window.URL.revokeObjectURL(url);
                    });
                }
            });
        }
    }

}

checkMissingFields = () => {
    let necessaryFields = [
        "skuInput",
        "nameInput",
        "sellPriceInput"
    ] // id degli input necessari

    let missingFields = [];

    necessaryFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            missingFields.push(fieldId);
            field.classList.add("is-invalid");
        } else if (field) {
            field.classList.remove("is-invalid");
        }
    });
    if (missingFields.length > 0) {
        toastpopup("Per favore, compila tutti i campi obbligatori contrassegnati con *.", "error");
        return false
    } else { return true };
}

async function loadModal(suppliers, brands, categories,) {
    const modalContainer = document.getElementById("modal-container");
    if (!modalContainer) { console.log("Modal container not found"); return; }
    try {
        const response = await fetch("config/newProductModal.html");
        modalContainer.innerHTML = await response.text();
        // Populate suppliers
        for (const [id, name] of Object.entries(suppliers)) {
            const option = document.createElement("option");
            option.value = name.id;
            option.textContent = name.name;
            const supplierSelect = document.getElementById("supplierSelect");
            if (supplierSelect) {

                supplierSelect.appendChild(option);
            } else {
                toastpopup("Supplier select element not found");
            }
        }

        // Populate brands
        for (const [id, name] of Object.entries(brands)) {
            const option = document.createElement("option");
            option.value = name.id;
            option.textContent = name.name;
            const brandSelect = document.getElementById("brandSelect");
            if (brandSelect) {
                brandSelect.appendChild(option);
            } else {
                toastpopup("Brand select element not found");
            }
        }

        // Populate categories

        for (const [id, name] of Object.entries(categories)) {
            const option = document.createElement("option");
            option.value = name.id;
            option.textContent = name.name;
            const categorySelect = document.getElementById("categorySelect");
            if (categorySelect) {
                categorySelect.appendChild(option);
            } else {
                toastpopup("Category select element not found");
            }
        }
    } catch (error) {
        console.error("Error loading modal:", error);
        toastpopup("Error loading modal:", "danger");
    }

    document.getElementById("skuSaveProductBtn").onclick = async function () {
        if (!checkMissingFields()) { return }
        fields = {
            sku: document.getElementById("skuInput").value.trim(),
            name: document.getElementById("nameInput").value.trim(),
            description: document.getElementById("descriptionInput").value.trim(),
            internal_notes: document.getElementById("internalNotesInput").value.trim(),
            brand_id: selectValueToNullableInt("brandSelect"),
            category_id: selectValueToNullableInt("categorySelect"),
            supplier_id: selectValueToNullableInt("supplierSelect"),
            status: parseInt(document.getElementById("statusSelect").value) || 1,
            sell_price: parseFloat(document.getElementById("sellPriceInput").value) || 0,
            stock: parseInt(document.getElementById("stockInput").value) || 0,
            min_stock: parseInt(document.getElementById("minStockInput").value) || 0,
            ean: document.getElementById("eanInput").value.trim(),
            weight_grams: parseInt(document.getElementById("weightInput").value) || 0,
            tag_ids: getSelectedProductTagIds()
        }

        apiPost("/products/newProduct", fields).then(response => {
            const tagIds = getSelectedProductTagIds();
            if (response.success && response.success === true) {
                const skuModal = document.getElementById("skuProductModal");
                const modal = bootstrap.Modal.getInstance(skuModal);
                toastpopup("Prodotto aggiunto con successo!", "success");
                sleep(1000).then(() => {
                    window.location.reload();
                });
            } else { toastpopup("Errore durante l'aggiunta del prodotto: " + response.error, "danger"); }
        });
    }
};

async function quickFetchProducts() {
    try {
        const sort = getSkuSortParams();

        const response = await apiPost("/products/quickFetch", {
            limit: parseInt(document.getElementById("skuPageSizeLabel").textContent) || 50,
            lookup: document.getElementById("skuSearchInput").value.trim(),

            brand: selectValueToNullableInt("brandFilter"),
            category: selectValueToNullableInt("categoryFilter"),
            supplier: selectValueToNullableInt("supplierFilter"),
            status: selectValueToNullableInt("statusFilter"),

            understock: !!document.getElementById("onlyUnderMinStock").checked,

            sort_by: sort.sort_by,
            sort_dir: sort.sort_dir
        });

        if (response.success && response.success === true) {
            return response.data;
        }

    } catch (error) {
        toastpopup("Error fetching products: " + error.message, "danger");
    }
}

async function populateTable(products) {
    const tbody = document.getElementById("productTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const list = Array.isArray(products) ? products : [];

    if (list.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="11" class="py-5">
                <div class="d-flex flex-column align-items-center text-center gap-2">
                    <div class="rounded-circle bg-light d-flex align-items-center justify-content-center"
                        style="width: 56px; height: 56px;">
                        <i class="bi bi-search fs-3 text-secondary"></i>
                    </div>

                    <div class="fw-semibold">Nessun prodotto trovato</div>
                    <div class="text-muted small" style="max-width: 520px;">
                        Prova a modificare i filtri o crea un nuovo prodotto.
                    </div>

                    <div class="d-flex flex-wrap justify-content-center gap-2 mt-2">
                        <button type="button" class="btn btn-outline-secondary" id="skuEmptyResetBtn">
                            Reset filtri
                        </button>

                        <button type="button" class="btn btn-primary"
                                data-bs-toggle="modal" data-bs-target="#skuProductModal">
                            Nuovo prodotto
                        </button>
                    </div>
                </div>
            </td>
        </tr>
        `;
        return;
    }

    for (const product of list) {
        const row = document.createElement("tr");

        const rawPrice = product.sell_price ?? 0;
        const priceStr = (typeof rawPrice === "number")
            ? rawPrice.toFixed(2)
            : String(rawPrice);

        row.innerHTML = `
            <td class="ps-3">${product.id}</td>
            <td>${product.sku}</td>
            <td>${product.name}</td>
            <td class="text-center" data-brand-id="${product.brand_id ?? ""}">${product.brand_name || ""}</td>
            <td class="text-center" data-category-id="${product.category_id ?? ""}">${product.category_name || ""}</td>
            <td class="text-center" data-supplier-id="${product.supplier_id ?? ""}">${product.supplier_name || ""}</td>
            <td>${priceStr.endsWith(".00") ? priceStr.replace(".00", "") : priceStr}€</td>
            <td class="text-center ${(product.stock < product.min_stock) || (product.stock === 0) ? "text-danger" : ""}">${product.stock}</td>
            <td class="text-center">${product.status === 1 ? '<span class="badge bg-success">Attivo</span>' : '<span class="badge bg-secondary">Inattivo</span>'}</td>
            <td class="text-end">${product.updated_at ? new Date(product.updated_at).toLocaleDateString() : ""}</td>
            <td class="text-end pe-3">${product.position_name || ""}</td>
        `;
        tbody.appendChild(row);
    }
    document.getElementById("products-shown").innerHTML = (`${list.length} mostrati`);
}


function populateFilters(suppliers, brands, categories) {
    const supplierFilter = document.getElementById("supplierFilter");
    const brandFilter = document.getElementById("brandFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    // Populate suppliers
    for (const [id, name] of Object.entries(suppliers)) {
        const option = document.createElement("option");
        option.value = name.id;
        option.textContent = name.name;
        if (supplierFilter) supplierFilter.appendChild(option);
    }
    // Populate brands
    for (const [id, name] of Object.entries(brands)) {
        const option = document.createElement("option");
        option.value = name.id;
        option.textContent = name.name;
        if (brandFilter) brandFilter.appendChild(option);
    }
    // Populate categories
    for (const [id, name] of Object.entries(categories)) {
        const option = document.createElement("option");
        option.value = name.id;
        option.textContent = name.name;
        if (categoryFilter) categoryFilter.appendChild(option);
    }
}

document.getElementById("skuFiltersApply").onclick = async function () {
    await refreshProductsTable();
}

const skuSearchInput = document.getElementById("skuSearchInput");
const skuSearchClearBtn = document.getElementById("skuSearchClearBtn");

function updateSkuSearchClearBtn() {
    const hasValue = (skuSearchInput?.value || "").length > 0;
    skuSearchClearBtn?.classList.toggle("d-none", !hasValue);
}

if (skuSearchInput && skuSearchClearBtn) {
    skuSearchInput.addEventListener("input", () => {
        updateSkuSearchClearBtn();
    });

    skuSearchClearBtn.addEventListener("click", () => {
        skuSearchInput.value = "";
        updateSkuSearchClearBtn();
        skuSearchInput.focus();
    });

    updateSkuSearchClearBtn();
}

const SKU_SORT_STORAGE_KEY = "sku_manager.sort";
let skuSortBy = "id";
let skuSortDir = "asc"; // "asc" | "desc"

function loadSkuSortFromStorage() {
    try {
        const raw = localStorage.getItem(SKU_SORT_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object") {
            if (typeof parsed.sort_by === "string" && parsed.sort_by.trim() !== "") {
                skuSortBy = parsed.sort_by.trim();
            }
            if (parsed.sort_dir === "asc" || parsed.sort_dir === "desc") {
                skuSortDir = parsed.sort_dir;
            }
        }
    } catch (e) {
        console.warn("SKU sort storage read error:", e);
    }
}

function saveSkuSortToStorage() {
    try {
        localStorage.setItem(SKU_SORT_STORAGE_KEY, JSON.stringify({
            sort_by: skuSortBy,
            sort_dir: skuSortDir
        }));
    } catch (e) {
        console.warn("SKU sort storage write error:", e);
    }
}

function updateSkuSortUi() {
    const table = document.getElementById("productTable");
    if (!table) return;

    const ths = table.querySelectorAll("thead th.sortable[data-sort]");
    ths.forEach(th => {
        const key = (th.dataset.sort || "").trim();
        const icon = th.querySelector("i");

        th.classList.remove("text-primary");
        if (icon) {
            icon.classList.remove("bi-sort-up-alt", "bi-sort-down-alt");
            icon.classList.add("bi-arrow-down-up");
            icon.classList.add("text-muted");
        }

        if (key && key === skuSortBy) {
            th.classList.add("text-primary");
            if (icon) {
                icon.classList.remove("bi-arrow-down-up");
                icon.classList.remove("text-muted");
                icon.classList.add(skuSortDir === "asc" ? "bi-sort-up-alt" : "bi-sort-down-alt");
            }
        }
    });
}

async function refreshProductsTable() {
    const data = await quickFetchProducts();
    await populateTable(data || []);
}

function initProductSorting() {
    loadSkuSortFromStorage();
    updateSkuSortUi();

    const table = document.getElementById("productTable");
    if (!table) return;

    const thead = table.querySelector("thead");
    if (!thead) return;

    thead.addEventListener("click", async (e) => {
        const th = e.target.closest("th.sortable[data-sort]");
        if (!th) return;

        const key = (th.dataset.sort || "").trim();
        if (!key) return;

        if (skuSortBy === key) {
            skuSortDir = (skuSortDir === "asc") ? "desc" : "asc";
        } else {
            skuSortBy = key;
            skuSortDir = "asc";
        }

        saveSkuSortToStorage();
        updateSkuSortUi();

        await refreshProductsTable();
    });
}

function getSkuSortParams() {
    return { sort_by: skuSortBy, sort_dir: skuSortDir };
}

const skuFilterForm = document.getElementById("skuFilterForm");

if (skuFilterForm) {
  skuFilterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await refreshProductsTable();
  });
}

document.getElementById("Reset").onclick = async function () {
    if (!skuFilterForm) return;
    skuFilterForm.reset();
    await refreshProductsTable();
}




window.addEventListener("DOMContentLoaded", async function () {
    suppliers = await fetchSuppliers();
    brands = await fetchBrands();
    categories = await fetchCategories();

    fetchTotalProducts();
    fetchUnderStock();

    await loadModal(suppliers, brands, categories);
    populateFilters(suppliers, brands, categories);

    loadExport();
    await loadProductTagsIntoCache();
    initTagPicker();
    resetSelectedTags([]);

    initProductSorting();
    await refreshProductsTable();
});


