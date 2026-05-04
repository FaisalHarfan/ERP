// server/models/index.js — All Sequelize models
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ═══════════════════════════════════════════════
// 1. CORE: Users, Roles, SystemLogs
// ═══════════════════════════════════════════════
const Role = sequelize.define('roles', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    department: DataTypes.STRING(100),
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
    permissions: { type: DataTypes.JSONB, defaultValue: {} }
});

const User = sequelize.define('users', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    full_name: { type: DataTypes.STRING(200), allowNull: false },
    email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    username: DataTypes.STRING(100),
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role_id: { type: DataTypes.STRING(50), references: { model: Role, key: 'id' } },
    status: { type: DataTypes.STRING(20), defaultValue: 'AKTIF' },
    avatar: DataTypes.STRING(10),
    permissions: { type: DataTypes.JSONB, defaultValue: null }
});

const SystemLog = sequelize.define('system_logs', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.STRING(50),
    user_email: DataTypes.STRING(200),
    action: DataTypes.STRING(100),
    details: DataTypes.TEXT,
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// ═══════════════════════════════════════════════
// 2. MASTER DATA
// ═══════════════════════════════════════════════
const Unit = sequelize.define('units', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: DataTypes.STRING(100)
});

const Customer = sequelize.define('customers', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: DataTypes.STRING(50),
    address: DataTypes.TEXT,
    email: DataTypes.STRING(200),
    contact_person: DataTypes.STRING(200),
    npwp: DataTypes.STRING(50),
    payment_terms: DataTypes.STRING(100),
    default_tax: DataTypes.DECIMAL(5, 2)
});

const Supplier = sequelize.define('suppliers', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: DataTypes.STRING(50),
    address: DataTypes.TEXT,
    email: DataTypes.STRING(200),
    contact_person: DataTypes.STRING(200),
    npwp: DataTypes.STRING(50),
    payment_terms: DataTypes.STRING(100),
    category: DataTypes.STRING(100)
});

const Warehouse = sequelize.define('warehouses', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    location: DataTypes.TEXT,
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' }
});

const Department = sequelize.define('departments', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false }
});

// ═══════════════════════════════════════════════
// 3. INVENTORY
// ═══════════════════════════════════════════════
const InventoryItem = sequelize.define('inventory_items', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    item_code: { type: DataTypes.STRING(50), unique: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    category: DataTypes.STRING(50), // RAW_MATERIAL, FINISHED_GOODS, WIP, OVEN_BASAH_STOCK, OVEN_KERING_STOCK
    unit: DataTypes.STRING(20),
    base_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    min_stock: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    description: DataTypes.TEXT
});

const StockTransaction = sequelize.define('stock_transactions', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    tx_no: DataTypes.STRING(50),
    date: DataTypes.DATE,
    item_id: DataTypes.STRING(50),
    item_code: DataTypes.STRING(50),
    item_name: DataTypes.STRING(200),
    type: DataTypes.STRING(30), // IN, OUT, ADJUST_IN, ADJUST_OUT, PRODUCTION_IN, etc.
    qty: DataTypes.DECIMAL(15, 2),
    reference: DataTypes.STRING(50),
    reference_id: DataTypes.STRING(50),
    notes: DataTypes.TEXT,
    created_by: DataTypes.STRING(100),
    location: DataTypes.STRING(50)
});

const StockMovement = sequelize.define('stock_movements', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    date: DataTypes.DATE,
    product_id: DataTypes.STRING(50),
    type: DataTypes.STRING(10),
    qty: DataTypes.DECIMAL(15, 2),
    reference_type: DataTypes.STRING(50),
    reference_id: DataTypes.STRING(50),
    notes: DataTypes.TEXT,
    created_by: DataTypes.STRING(100)
});

const InventoryJudgment = sequelize.define('inventory_judgments', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} } // stores full document
});

const InventoryConversion = sequelize.define('inventory_conversions', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// 4. SALES
// ═══════════════════════════════════════════════
const SalesQuotation = sequelize.define('sales_quotations', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    qt_number: DataTypes.STRING(50),
    customer_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    valid_until: DataTypes.DATE,
    status: { type: DataTypes.STRING(30), defaultValue: 'DRAFT' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    payment_terms: DataTypes.STRING(100),
    notes: DataTypes.TEXT
});

const SalesOrder = sequelize.define('sales_orders', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    so_number: DataTypes.STRING(50),
    customer_id: DataTypes.STRING(50),
    quotation_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    status: { type: DataTypes.STRING(30), defaultValue: 'DRAFT' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    payment_terms: DataTypes.STRING(100),
    notes: DataTypes.TEXT
});

const SalesInvoice = sequelize.define('sales_invoices', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    inv_number: DataTypes.STRING(50),
    customer_id: DataTypes.STRING(50),
    so_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    due_date: DataTypes.DATE,
    status: { type: DataTypes.STRING(30), defaultValue: 'UNPAID' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_type: DataTypes.STRING(30),
    tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: DataTypes.TEXT
});

const Payment = sequelize.define('payments', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    invoice_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    amount: DataTypes.DECIMAL(15, 2),
    method: DataTypes.STRING(50),
    reference: DataTypes.STRING(100),
    bank_account_id: DataTypes.STRING(50),
    notes: DataTypes.TEXT
});

const DeliveryOrder = sequelize.define('delivery_orders', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const SalesReturn = sequelize.define('sales_returns', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const ProductExchange = sequelize.define('product_exchanges', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// 5. PURCHASING
// ═══════════════════════════════════════════════
const PurchaseRFQ = sequelize.define('purchase_rfqs', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const PurchaseOrder = sequelize.define('purchase_orders', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    po_number: DataTypes.STRING(50),
    supplier_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    status: { type: DataTypes.STRING(30), defaultValue: 'DRAFT' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: DataTypes.TEXT
});

const PurchaseInvoice = sequelize.define('purchase_invoices', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    inv_number: DataTypes.STRING(50),
    supplier_id: DataTypes.STRING(50),
    po_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    due_date: DataTypes.DATE,
    status: { type: DataTypes.STRING(30), defaultValue: 'UNPAID' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: DataTypes.TEXT
});

const SupplierPayment = sequelize.define('supplier_payments', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    invoice_id: DataTypes.STRING(50),
    date: DataTypes.DATE,
    amount: DataTypes.DECIMAL(15, 2),
    method: DataTypes.STRING(50),
    reference: DataTypes.STRING(100),
    bank_account_id: DataTypes.STRING(50),
    notes: DataTypes.TEXT,
    kategori: DataTypes.STRING(100),
    status: DataTypes.STRING(30)
});

const PurchaseRequest = sequelize.define('purchase_requests', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// 6. PRODUCTION
// ═══════════════════════════════════════════════
const Machine = sequelize.define('machines', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    code: DataTypes.STRING(50),
    name: DataTypes.STRING(200),
    type: DataTypes.STRING(30), // MACHINE, OVEN
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' }
});

const BOMHeader = sequelize.define('bom_headers', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    bom_code: DataTypes.STRING(50),
    product_id: DataTypes.STRING(50),
    product_name: DataTypes.STRING(200),
    qty: DataTypes.DECIMAL(15, 2),
    unit: DataTypes.STRING(20),
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    notes: DataTypes.TEXT
});

const BOMMaterial = sequelize.define('bom_materials', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    bom_id: DataTypes.STRING(50),
    item_id: DataTypes.STRING(50),
    item_name: DataTypes.STRING(200),
    qty: DataTypes.DECIMAL(15, 2),
    unit: DataTypes.STRING(20)
});

const ManufacturingOrder = sequelize.define('manufacturing_orders', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const DailyProductionLog = sequelize.define('daily_production_logs', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const ProductionLineBatch = sequelize.define('production_line_batches', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const ProductionOrder = sequelize.define('production_orders', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const BOM = sequelize.define('boms', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// 7. FINANCE
// ═══════════════════════════════════════════════
const Account = sequelize.define('accounts', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    type: DataTypes.STRING(20), // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
    description: DataTypes.TEXT,
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
});

const JournalEntry = sequelize.define('journal_entries', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    date: DataTypes.DATE,
    journal_no: DataTypes.STRING(50),
    description: DataTypes.TEXT,
    reference_type: DataTypes.STRING(50),
    reference_id: DataTypes.STRING(50),
    department_id: DataTypes.STRING(50),
    partner_id: DataTypes.STRING(50),
    partner_name: DataTypes.STRING(200),
    items: { type: DataTypes.JSONB, defaultValue: [] },
    total_debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
});

const Expense = sequelize.define('expenses', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    expense_no: DataTypes.STRING(50),
    date: DataTypes.DATE,
    description: DataTypes.TEXT,
    amount: DataTypes.DECIMAL(15, 2),
    from_account_id: DataTypes.STRING(50),
    to_account_id: DataTypes.STRING(50),
    department_id: DataTypes.STRING(50),
    method: DataTypes.STRING(50),
    journal_id: DataTypes.STRING(50)
});

const Receipt = sequelize.define('receipts', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    receipt_no: DataTypes.STRING(50),
    date: DataTypes.DATE,
    description: DataTypes.TEXT,
    amount: DataTypes.DECIMAL(15, 2),
    target_account_id: DataTypes.STRING(50),
    source_account_id: DataTypes.STRING(50),
    method: DataTypes.STRING(50),
    journal_id: DataTypes.STRING(50)
});

const BankAccount = sequelize.define('bank_accounts', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    name: DataTypes.STRING(200),
    account_number: DataTypes.STRING(50),
    bank_name: DataTypes.STRING(100),
    account_id: DataTypes.STRING(50)
});

const CreditNote = sequelize.define('credit_notes', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const DebitNote = sequelize.define('debit_notes', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// 8. MISC
// ═══════════════════════════════════════════════
const Notification = sequelize.define('notifications', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

const PackBreakdown = sequelize.define('pack_breakdowns', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    data: { type: DataTypes.JSONB, defaultValue: {} }
});

// ═══════════════════════════════════════════════
// ASSOCIATIONS
// ═══════════════════════════════════════════════
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id' });

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════
const models = {
    Role, User, SystemLog, Unit, Customer, Supplier, Warehouse, Department,
    InventoryItem, StockTransaction, StockMovement, InventoryJudgment, InventoryConversion,
    SalesQuotation, SalesOrder, SalesInvoice, Payment, DeliveryOrder, SalesReturn, ProductExchange,
    PurchaseRFQ, PurchaseOrder, PurchaseInvoice, SupplierPayment, PurchaseRequest,
    Machine, BOMHeader, BOMMaterial, ManufacturingOrder, DailyProductionLog,
    ProductionLineBatch, ProductionOrder, BOM,
    Account, JournalEntry, Expense, Receipt, BankAccount, CreditNote, DebitNote,
    Notification, PackBreakdown
};

// Helper: map LocalStorage table names → Sequelize model
models.TABLE_MAP = {
    users: User, roles: Role, systemLogs: SystemLog,
    units: Unit, customers: Customer, suppliers: Supplier,
    warehouses: Warehouse, departments: Department,
    inventoryItems: InventoryItem, stockTransactions: StockTransaction,
    stockMovements: StockMovement, inventoryJudgments: InventoryJudgment,
    inventoryConversions: InventoryConversion,
    salesQuotations: SalesQuotation, salesOrders: SalesOrder,
    salesInvoices: SalesInvoice, payments: Payment,
    deliveryOrders: DeliveryOrder, salesReturns: SalesReturn,
    productExchanges: ProductExchange,
    purchaseRFQs: PurchaseRFQ, purchaseOrders: PurchaseOrder,
    purchaseInvoices: PurchaseInvoice, supplierPayments: SupplierPayment,
    purchaseRequests: PurchaseRequest,
    machines: Machine, bomHeaders: BOMHeader, bomMaterials: BOMMaterial,
    manufacturingOrders: ManufacturingOrder, dailyProductionLogs: DailyProductionLog,
    productionLineBatches: ProductionLineBatch, productionOrders: ProductionOrder,
    boms: BOM,
    accounts: Account, journalEntries: JournalEntry, expenses: Expense, receipts: Receipt,
    bankAccounts: BankAccount, creditNotes: CreditNote, debitNotes: DebitNote,
    notifications: Notification, packBreakdowns: PackBreakdown
};

module.exports = models;
