// api.js — Frontend API wrapper that replaces LocalStorage db.* calls
// This file provides the same interface as db.js but calls the REST API backend.
// Usage: drop-in replacement for db.read(), db.insert(), db.update(), db.delete()

const API_BASE = '/api';

const TABLES = [
    'units', 'warehouses', 'suppliers', 'customers',
    'purchaseRequests', 'purchaseOrders', 'purchaseInvoices', 'supplierPayments',
    'salesQuotations', 'purchaseRFQs', 'salesOrders', 'salesInvoices', 'payments',
    'boms', 'productionOrders', 'stockMovements',
    'inventoryItems', 'stockTransactions', 'notifications',
    'machines', 'bomHeaders', 'bomMaterials', 'manufacturingOrders',
    'dailyProductionLogs', 'productionLineBatches',
    'accounts', 'expenses', 'receipts', 'journalEntries', 'bankAccounts', 'departments',
    'creditNotes', 'debitNotes',
    'salesReturns', 'productExchanges', 'deliveryOrders',
    'inventoryJudgments', 'inventoryConversions', 'packBreakdowns',
    'users', 'roles', 'systemLogs'
];

// ─── Token Management ─────────────────────────
function getToken() {
    try {
        const session = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
        return session.token || '';
    } catch { return ''; }
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
}

// ─── Core API calls ───────────────────────────
const api = {
    /**
     * Read all records from a table
     * Replaces: db.read('tableName')
     */
    read: async (table) => {
        try {
            console.log(`[API] Reading table: ${table}...`);
            const res = await fetch(`${API_BASE}/data/${table}`, { headers: authHeaders() });
            if (!res.ok) {
                if (res.status === 401) {
                    // Token benar-benar tidak valid — redirect ke login
                    console.error('[API] Unauthorized. Redirecting to login.');
                    window.location.href = 'login.html';
                    return [];
                }
                if (res.status === 403) {
                    // Akses ditolak (tabel BLOCKED atau tidak punya permission)
                    // Jangan redirect — cukup return kosong
                    console.warn(`[API] Access denied for table: ${table}`);
                    return [];
                }
                const errBody = await res.json().catch(() => ({}));
                console.error(`[API] Read error (${table}): Status ${res.status}`, errBody);
                return [];
            }
            const data = await res.json();
            console.log(`[API] Successfully read ${data.length} records for ${table}.`);
            return data;
        } catch (err) {
            console.error(`[API] Read(${table}) fetch error:`, err);
            return [];
        }
    },

    /**
     * Find a single record by ID
     * Replaces: db.findById('tableName', id)
     */
    findById: async (table, id) => {
        try {
            const res = await fetch(`${API_BASE}/data/${table}/${id}`, { headers: authHeaders() });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error(`API findById(${table}, ${id}) error:`, err);
            return null;
        }
    },

    /**
     * Insert a new record
     * Replaces: db.insert('tableName', record)
     */
    insert: async (table, record) => {
        try {
            console.log(`[API] Inserting into ${table}:`, record);
            const res = await fetch(`${API_BASE}/data/${table}`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(record)
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                console.error(`[API] Insert error (${table}): Status ${res.status}`, errBody);
                throw new Error(`Insert failed: ${res.status}. ${errBody.error || ''}`);
            }
            const result = await res.json();
            console.log(`[API] Insert successful for ${table}.`);
            return result;
        } catch (err) {
            console.error(`[API] Insert(${table}) error:`, err);
            showToast(`Gagal menyimpan data ke server: ${err.message}`, 'error');
            return null;
        }
    },

    /**
     * Update an existing record
     * Replaces: db.update('tableName', id, updates)
     */
    update: async (table, id, updates) => {
        try {
            const res = await fetch(`${API_BASE}/data/${table}/${id}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error(`Update failed: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`API update(${table}, ${id}) error:`, err);
            return null;
        }
    },

    /**
     * Delete a record
     * Replaces: db.delete('tableName', id)
     */
    delete: async (table, id) => {
        try {
            const res = await fetch(`${API_BASE}/data/${table}/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        } catch (err) {
            console.error(`API delete(${table}, ${id}) error:`, err);
        }
    },

    /**
     * Save entire table (for bulk migration)
     */
    saveBulk: async (table, records) => {
        try {
            const res = await fetch(`${API_BASE}/data/${table}/bulk`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(records)
            });
            return await res.json();
        } catch (err) {
            console.error(`API saveBulk(${table}) error:`, err);
            return null;
        }
    },

    /**
     * Login (special endpoint)
     */
    login: async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return await res.json();
    },

    // ─── Settings API (Fase 2) ─────────────────────────────────

    getUsers: async () => {
        const res = await fetch(`${API_BASE}/settings/users`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Gagal mengambil data user');
        return await res.json();
    },
    createUser: async (data) => {
        const res = await fetch(`${API_BASE}/settings/users`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat user'); }
        return await res.json();
    },
    updateUser: async (id, data) => {
        const res = await fetch(`${API_BASE}/settings/users/${id}`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal update user'); }
        return await res.json();
    },
    deleteUser: async (id) => {
        const res = await fetch(`${API_BASE}/settings/users/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal hapus user'); }
        return await res.json();
    },

    getRoles: async () => {
        const res = await fetch(`${API_BASE}/settings/roles`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Gagal mengambil data role');
        return await res.json();
    },
    createRole: async (data) => {
        const res = await fetch(`${API_BASE}/settings/roles`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat role'); }
        return await res.json();
    },
    updateRole: async (id, data) => {
        const res = await fetch(`${API_BASE}/settings/roles/${id}`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal update role'); }
        return await res.json();
    },
    deleteRole: async (id) => {
        const res = await fetch(`${API_BASE}/settings/roles/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal hapus role'); }
        return await res.json();
    },

    // ─── Inventory API (Fase 2) ────────────────────────────────

    getInventoryItems: async () => {
        // Add timestamp to bust any server-side or proxy cache
        const ts = Date.now();
        const res = await fetch(`${API_BASE}/inventory/items?_t=${ts}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Gagal mengambil data barang');
        return await res.json();
    },
    createInventoryItem: async (data) => {
        const res = await fetch(`${API_BASE}/inventory/items`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat barang'); }
        return await res.json();
    },
    updateInventoryItem: async (id, data) => {
        const res = await fetch(`${API_BASE}/inventory/items/${id}`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal update barang'); }
        return await res.json();
    },
    deleteInventoryItem: async (id) => {
        const res = await fetch(`${API_BASE}/inventory/items/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal hapus barang'); }
        return await res.json();
    },
    createInventoryTransaction: async (data) => {
        const res = await fetch(`${API_BASE}/inventory/transactions`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat transaksi stok'); }
        return await res.json();
    },

    // ─── Sales API (Fase 2) ────────────────────────────────────

    approveSalesOrder: async (id) => {
        const res = await fetch(`${API_BASE}/sales/orders/${id}/approve`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal approve Sales Order'); }
        return await res.json();
    },

    shipDeliveryOrder: async (id, data) => {
        const res = await fetch(`${API_BASE}/sales/delivery/${id}/ship`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data || {})
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal konfirmasi pengiriman'); }
        return await res.json();
    },

    // ─── Sales Return API ─────────────────────────────────────

    createSalesReturn: async (data) => {
        const res = await fetch(`${API_BASE}/sales/returns`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat Sales Return'); }
        return await res.json();
    },
    approveSalesReturn: async (id) => {
        const res = await fetch(`${API_BASE}/sales/returns/${id}/approve`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal approve Sales Return'); }
        return await res.json();
    },
    rejectSalesReturn: async (id) => {
        const res = await fetch(`${API_BASE}/sales/returns/${id}/reject`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal reject Sales Return'); }
        return await res.json();
    },
    receiveSalesReturn: async (id, data) => {
        const res = await fetch(`${API_BASE}/sales/returns/${id}/receive`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal konfirmasi penerimaan retur'); }
        return await res.json();
    },

    // ─── Product Exchange (Tukar Guling) API ─────────────────

    createProductExchange: async (data) => {
        const res = await fetch(`${API_BASE}/sales/exchanges`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat Tukar Guling'); }
        return await res.json();
    },
    approveProductExchange: async (id) => {
        const res = await fetch(`${API_BASE}/sales/exchanges/${id}/approve`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal approve Tukar Guling'); }
        return await res.json();
    },
    rejectProductExchange: async (id) => {
        const res = await fetch(`${API_BASE}/sales/exchanges/${id}/reject`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal reject Tukar Guling'); }
        return await res.json();
    },
    receiveProductExchange: async (id, data) => {
        const res = await fetch(`${API_BASE}/sales/exchanges/${id}/receive`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal konfirmasi penerimaan tukar guling'); }
        return await res.json();
    },
    shipProductExchange: async (id) => {
        const res = await fetch(`${API_BASE}/sales/exchanges/${id}/ship`, { method: 'POST', headers: authHeaders() });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal kirim pengganti tukar guling'); }
        return await res.json();
    },

    // ─── Purchase API (Fase 2) ────────────────────────────────

    receivePOGoods: async (poId, data) => {
        const res = await fetch(`${API_BASE}/purchase/orders/${poId}/receive`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menerima barang PO'); }
        return await res.json();
    },

    paySupplierInvoice: async (invoiceId, data) => {
        const res = await fetch(`${API_BASE}/purchase/payments/${invoiceId}/pay`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memproses pembayaran'); }
        return await res.json();
    },

    // ─── Production API (Fase 2) ───────────────────────────────

    startProductionOrder: async (data) => {
        const res = await fetch(`${API_BASE}/production/orders/start`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memulai produksi'); }
        return await res.json();
    },

    completeProductionOrder: async (id, data) => {
        const res = await fetch(`${API_BASE}/production/orders/${id}/complete`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyelesaikan produksi'); }
        return await res.json();
    },

    deleteProductionOrder: async (id) => {
        const res = await fetch(`${API_BASE}/production/orders/${id}`, {
            method: 'DELETE', headers: authHeaders()
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menghapus MO'); }
        return await res.json();
    },

    // ─── FINANCE ───
    saveAccount: async (data) => {
        const res = await fetch(`${API_BASE}/finance/accounts`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan akun'); }
        return await res.json();
    },

    createJournalEntry: async (data) => {
        const res = await fetch(`${API_BASE}/finance/journal`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat jurnal'); }
        return await res.json();
    },

    saveExpense: async (data) => {
        const res = await fetch(`${API_BASE}/finance/expenses`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan pengeluaran'); }
        return await res.json();
    },

    saveReceipt: async (data) => {
        const res = await fetch(`${API_BASE}/finance/receipts`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan penerimaan'); }
        return await res.json();
    },

    getLedger: async (accountId, filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_BASE}/finance/ledger/${accountId}?${query}`, {
            headers: authHeaders()
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengambil mutasi'); }
        return await res.json();
    },

    /**
     * Verify current session
     */
    verifySession: async () => {
        try {
            const token = getToken();
            if (!token) {
                console.log('[API] No token found for verification');
                return null;
            }
            
            const res = await fetch(`${API_BASE}/auth/verify`, { headers: authHeaders() });
            if (!res.ok) {
                console.log(`[API] Token verification failed: ${res.status}`);
                return null;
            }
            const data = await res.json();
            console.log('[API] Token verified successfully');
            return data;
        } catch (err) {
            console.error('[API] verifySession error:', err);
            return null;
        }
    },

    /**
     * Pull all data from Postgres to LocalStorage (Sync Down)
     * Useful for initial load or manual refresh to stay synced with other users
     * Note: users, roles, systemLogs are excluded — they use dedicated /api/settings endpoints
     */
    pullAll: async () => {
        // Tables blocked from generic CRUD — use dedicated endpoints instead
        const BLOCKED_TABLES = ['users', 'roles', 'systemLogs'];

        try {
            const pullableTables = TABLES.filter(t => !BLOCKED_TABLES.includes(t));
            const promises = pullableTables.map(table => api.read(table).then(data => ({ table, data })));
            const results = await Promise.all(promises);
            
            let synced = 0;
            results.forEach(({ table, data }) => {
                if (data && Array.isArray(data)) {
                    localStorage.setItem('unityerp_' + table, JSON.stringify(data));
                    if (typeof db !== 'undefined' && typeof db.save === 'function') {
                        db.save(table, data);
                    } else if (window.db && typeof window.db.save === 'function') {
                        window.db.save(table, data);
                    }
                    synced++;
                }
            });
            console.log(`✅ Synced ${synced}/${pullableTables.length} tables from PostgreSQL to LocalStorage.`);
            return true;
        } catch (err) {
            console.error('Error pulling data from server:', err);
            return false;
        }
    }
};

// Make available globally
window.api = api;

// ─── Reusable Custom Dropdown Component ───────────────────────────
window.renderActionsDropdownHtml = (id, handlerName, options) => {
    // options is an array of [ [value, label, icon, extraClass], ... ]
    const buttons = options.map(([val, label, icon, extraClass]) => {
        const itemClass = extraClass || 'text-slate-700 hover:bg-blue-50 hover:text-blue-600';
        const iconClass = icon || 'fas fa-cog text-slate-400';
        return `
            <button onclick="event.stopPropagation(); ${handlerName}('${val}', '${id}')" class="group flex items-center w-full px-4 py-2.5 text-[11px] font-bold text-left transition-all ${itemClass}" role="menuitem">
                <i class="${iconClass} w-4 mr-2 group-hover:text-current transition-colors"></i> ${label}
            </button>
        `;
    }).join('');

    return `
        <div class="relative inline-block text-left font-sans">
            <button type="button" onclick="event.stopPropagation(); window.toggleActionsDropdown('${id}')" class="flex items-center justify-between gap-x-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 w-[115px]" id="menu-btn-${id}">
                <span>Pilih Aksi</span>
                <i class="fas fa-chevron-down text-[9px] text-slate-400 transition-transform duration-200" id="menu-arrow-${id}"></i>
            </button>
            <div class="hidden absolute right-0 z-[100] mt-1.5 w-44 origin-top-right rounded-xl bg-white shadow-xl border border-slate-150 overflow-hidden font-medium py-1 divide-y divide-slate-50 animate-in fade-in duration-150" id="menu-dropdown-${id}">
                ${buttons}
            </div>
        </div>
    `;
};

window.toggleActionsDropdown = (id) => {
    // Close all other open dropdowns first
    document.querySelectorAll('[id^="menu-dropdown-"]').forEach(el => {
        if (el.id !== `menu-dropdown-${id}`) {
            el.classList.add('hidden');
            const arrow = document.getElementById(`menu-arrow-${el.id.replace('menu-dropdown-', '')}`);
            if (arrow) arrow.classList.remove('rotate-180');
        }
    });

    const dropdown = document.getElementById(`menu-dropdown-${id}`);
    const arrow = document.getElementById(`menu-arrow-${id}`);
    if (dropdown) {
        const isHidden = dropdown.classList.toggle('hidden');
        if (arrow) {
            if (isHidden) {
                arrow.classList.remove('rotate-180');
            } else {
                arrow.classList.add('rotate-180');
            }
        }
    }
};

window.togglePOActionsDropdown = window.toggleActionsDropdown;

// Close all custom dropdowns when clicking outside
if (!window._globalDropdownListenerAdded) {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[id^="menu-btn-"]')) {
            document.querySelectorAll('[id^="menu-dropdown-"]').forEach(el => {
                el.classList.add('hidden');
                const id = el.id.replace('menu-dropdown-', '');
                const arrow = document.getElementById(`menu-arrow-${id}`);
                if (arrow) arrow.classList.remove('rotate-180');
            });
        }
    });
    window._globalDropdownListenerAdded = true;
}
