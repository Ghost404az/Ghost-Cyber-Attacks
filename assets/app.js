console.log("Script loaded!");
document.body.style.backgroundColor = "#f0f0f0"; 

const contentArea = document.getElementById('content-area');
if (contentArea) {
    contentArea.innerHTML = "Working.";
    console.log("Content updated successfully.");
} else {
    console.log("Could not find content-area element!");
}
