const downloadCSVTemplate = (headers) => {
  if (!Array.isArray(headers) || headers.length === 0) {
    alert("No headers available to download the template.");
    return;
  }

  const csvContent = headers.join(",") + "\n"; // ✅ Corrected usage

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
export default downloadCSVTemplate;