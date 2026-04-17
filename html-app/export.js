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
    if (!headerDiv) return;

    const exportBtn = document.createElement('button');
    exportBtn.id = 'global-export-btn';
    exportBtn.className = 'text-gray-500 hover:text-green-600 mr-2 flex items-center text-sm font-medium transition-colors border border-gray-200 rounded px-3 py-1 bg-white shadow-sm hover:shadow-md';
    exportBtn.innerHTML = '<i class="fas fa-file-excel mr-2 text-green-600"></i> Export List';
    exportBtn.title = 'Export data halaman ini';

    exportBtn.addEventListener('click', () => {
        const title = document.getElementById('pageTitle').innerText;
        
        // If we are on a dashboard, show dashboard options instead of simple table export
        if (title.toLowerCase().includes('dashboard')) {
            if (window.openDashboardOptions) {
                window.openDashboardOptions(title);
                return;
            }
        }
        
        exportTableToCSV(title.replace(/\s+/g, '_').toLowerCase());
    });

    // Update button text/icon based on view
    const observer = new MutationObserver(() => {
        const title = document.getElementById('pageTitle').innerText;
        if (title.toLowerCase().includes('dashboard')) {
            exportBtn.innerHTML = '<i class="fas fa-download mr-2 text-blue-500"></i> Download Options';
            exportBtn.className = 'text-gray-600 hover:text-blue-600 mr-2 flex items-center text-sm font-semibold transition-all border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm';
        } else {
            exportBtn.innerHTML = '<i class="fas fa-file-excel mr-2 text-green-600"></i> Export List';
            exportBtn.className = 'text-gray-500 hover:text-green-600 mr-2 flex items-center text-sm font-medium transition-colors border border-gray-200 rounded px-3 py-1 bg-white shadow-sm hover:shadow-md';
        }
        
        // Hide if launcher
        if (title.toLowerCase().includes('select department') || title.toLowerCase() === 'apps') {
            exportBtn.classList.add('hidden');
        } else {
            exportBtn.classList.remove('hidden');
        }
    });

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    // Insert just before the bell icon
    headerDiv.insertBefore(exportBtn, headerDiv.firstChild);
});
