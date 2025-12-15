async function fetchReturnProductsCount() {
    try {
        apiGet("/returns/returnOrdersCount").then(response => {
            if (response.success && response.success === true) {
                console.log("Total products count fetched:", response.data);
                const totalCount = response.data?.count ?? 0;
                let element = document.getElementById("returns-in-transit-count");
                if (element) {
                    element.textContent = totalCount; element.classList.remove("placeholder");
                } else { toastpopup(`element to replace not found`, "danger") }
            } else { toastpopup("Failed to fetch total products count:", response.error) }
        });
    }
    catch (error) {
        toastpopup("Error fetching total products count:", error);
    }
}

async function fetchReturnedToHandleCount() {
    try {
        apiGet("/returns/returnedToHandleCount").then(response => {
            if (response.success && response.success === true) {
                console.log("Total products count fetched:", response.data);
                const totalCount = response.data?.count ?? 0;
                let element = document.getElementById("returns-delivered-pending-count");
                if (element) {
                    element.textContent = totalCount; element.classList.remove("placeholder");
                } else { toastpopup(`element to replace not found`, "danger") }
            } else { toastpopup("Failed to fetch total products count:", response.error) }
        });
    }
    catch (error) {
        toastpopup("Error fetching total products count:", error);
    }
}

async function fetchReturnedWithProblemCount() {
    try {
        apiGet("/returns/returnedWithProblemCount").then(response => {
            if (response.success && response.success === true) {
                console.log("Total products count fetched:", response.data);
                const totalCount = response.data?.count ?? 0;
                let element = document.getElementById("returns-issues-count");
                if (element) {
                    element.textContent = totalCount; element.classList.remove("placeholder");
                } else { toastpopup(`element to replace not found`, "danger") }
            } else { toastpopup("Failed to fetch total products count:", response.error) }
        });
    }
    catch (error) {
        toastpopup("Error fetching total products count:", error);
    }
}


document.addEventListener("DOMContentLoaded", async function () {
    const statusesCache = (await apiGet("/master-data/statuses")).data;
    console.log(statusesCache);
    await fetchReturnProductsCount();
    await fetchReturnedToHandleCount();
    await fetchReturnedWithProblemCount();






});