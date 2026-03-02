// export.js - Simple Table to CSV Exporter

function exportTableToCSV(filename) {
    // Find the currently visible table
    const table = document.querySelector('table');
    if (!table) {
        showToast('Tidak ada tabel untuk diexport', 'error');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = "data:text/csv;charset=utf-8,";

    rows.forEach((row) => {
        let rowData = [];
        const cols = row.querySelectorAll('th, td');

        // Skip the last column if it's the "Aksi" (Action) column
        const maxCols = cols.length;
        const offset = (cols[maxCols - 1] && (cols[maxCols - 1].innerText.toLowerCase() === 'aksi' || cols[maxCols - 1].querySelector('button'))) ? 1 : 0;

        for (let i = 0; i < maxCols - offset; i++) {
            let data = cols[i].innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
            // Escape quotes inside the string
            data = data.replace(/"/g, '""');
            // Wrap in quotes
            rowData.push(`"${data}"`);
        }

        // Ignore rows that only had buttons (now empty)
        if (rowData.length > 0) {
            csvContent += rowData.join(",") + "\r\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
    showToast('Download CSV dimulai', 'success');
}

// Inject an generic export button next to the "Page Title" dynamically
document.addEventListener('DOMContentLoaded', () => {
    const headerDiv = document.querySelector('header .flex.items-center.space-x-4');

    const exportBtn = document.createElement('button');
    exportBtn.className = 'text-gray-500 hover:text-green-600 mr-2 flex items-center text-sm font-medium transition-colors border border-gray-200 rounded px-3 py-1 bg-white';
    exportBtn.innerHTML = '<i class="fas fa-file-excel mr-2 text-green-600"></i> Export List';
    exportBtn.title = 'Export tabel saat ini ke CSV/Excel';

    exportBtn.addEventListener('click', () => {
        const title = document.getElementById('pageTitle').innerText.replace(/\s+/g, '_').toLowerCase();
        exportTableToCSV(title);
    });

    // Insert just before the bell icon
    headerDiv.insertBefore(exportBtn, headerDiv.firstChild);
});
