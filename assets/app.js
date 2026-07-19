console.log("Script loaded!");
document.body.style.backgroundColor = "#f0f0f0"; // تغيير لون الخلفية للتأكد أن الملف يعمل

const contentArea = document.getElementById('content-area');
if (contentArea) {
    contentArea.innerHTML = "تم الاتصال بنجاح. النظام يعمل بكامل طاقته.";
    console.log("Content updated successfully.");
} else {
    console.log("Could not find content-area element!");
}
