const API_BASE_URL = "";           // vuoto → /orders, /orders/... direttamente
const STATIC_BASE_URL = "/static"; // punta a C:/.../source

const userMenu = document.querySelector(".discord-user-menu");
const userTab = document.getElementById("userTab");

userTab.addEventListener("click", () => {
    userMenu.classList.toggle("open");
});

