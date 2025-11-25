// document.querySelector(".newOrder").addEventListener("click", function(){
//     console.log("new order requested");

// });

const userMenu = document.querySelector(".discord-user-menu");
const userTab = document.getElementById("userTab");

userTab.addEventListener("click", () => {
    userMenu.classList.toggle("open");
});

