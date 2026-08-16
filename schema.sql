-- =============================================================================
-- WEAVEONE ERP — COMPLETE PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Compatible with Supabase SQL Editor and Standalone PostgreSQL 14+ / 16+
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USER & ROLE MANAGEMENT
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    mobile VARCHAR(20),
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    designation VARCHAR(100),
    primary_role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'REJECTED')),
    approval_status VARCHAR(30) DEFAULT 'ADMIN_APPROVED' CHECK (approval_status IN ('ADMIN_APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    creation_method VARCHAR(30) DEFAULT 'ADMIN_CREATED' CHECK (creation_method IN ('ADMIN_CREATED', 'REGISTRATION_REQUEST')),
    request_reason TEXT,
    rejection_reason TEXT,
    approved_by VARCHAR(150),
    approved_at TIMESTAMP WITH TIME ZONE,
    direct_permissions JSONB DEFAULT '{}'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    require_password_change BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by_name VARCHAR(150) NOT NULL,
    target_user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    remarks TEXT
);

-- -----------------------------------------------------------------------------
-- 2. MASTERS & COSTING MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'material', 'party', 'loom', 'beam', etc.
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_code VARCHAR(50) NOT NULL UNIQUE,
    party_name VARCHAR(200) NOT NULL,
    party_type VARCHAR(50) NOT NULL DEFAULT 'Job Party' CHECK (party_type IN ('Purchase Party', 'Sell Party', 'Job Party')),
    office_name VARCHAR(200),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    area VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    contact_person VARCHAR(150),
    designation VARCHAR(100),
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    job_work_applicable VARCHAR(10) DEFAULT 'Yes',
    job_work_remarks TEXT,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.party_sub_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE,
    sub_party_code VARCHAR(50) NOT NULL,
    sub_party_name VARCHAR(200) NOT NULL,
    party_type VARCHAR(50) NOT NULL CHECK (party_type IN ('Purchase Party', 'Sell Party', 'Job Party')),
    location_type VARCHAR(50) NOT NULL,
    location_type_other VARCHAR(100),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    area VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    gstin VARCHAR(15),
    pan VARCHAR(10),
    contact_person VARCHAR(150),
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    alternate_email VARCHAR(255),
    billing_address TEXT,
    shipping_address TEXT,
    delivery_address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    remarks TEXT,
    internal_notes TEXT,
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_by VARCHAR(150),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_party_sub_party_code UNIQUE (party_id, sub_party_code)
);

CREATE INDEX IF NOT EXISTS idx_sub_parties_party_id ON public.party_sub_parties(party_id);
CREATE INDEX IF NOT EXISTS idx_sub_parties_code ON public.party_sub_parties(sub_party_code);
CREATE INDEX IF NOT EXISTS idx_sub_parties_name ON public.party_sub_parties(sub_party_name);
CREATE INDEX IF NOT EXISTS idx_sub_parties_gstin ON public.party_sub_parties(gstin);
CREATE INDEX IF NOT EXISTS idx_sub_parties_status ON public.party_sub_parties(status);


CREATE TABLE IF NOT EXISTS public.cost_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. BYM-01
    fabric_quality_name VARCHAR(200) NOT NULL,
    reed INT NOT NULL,
    picks INT NOT NULL,
    reed_space DECIMAL(10,2) NOT NULL,
    loom_type VARCHAR(50),
    warp_cost_per_mtr DECIMAL(10,2) DEFAULT 0,
    weft_cost_per_mtr DECIMAL(10,2) DEFAULT 0,
    total_material_cost_per_mtr DECIMAL(10,2) DEFAULT 0,
    jobwork_rate_per_pick DECIMAL(10,4) DEFAULT 0,
    weaving_charges_per_mtr DECIMAL(10,2) DEFAULT 0,
    net_cost_per_mtr DECIMAL(10,2) DEFAULT 0,
    margin_percent DECIMAL(5,2) DEFAULT 0,
    final_selling_price_per_mtr DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_sheet_warp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_sheet_id UUID REFERENCES public.cost_sheets(id) ON DELETE CASCADE,
    yarn_name VARCHAR(150) NOT NULL,
    denier_count DECIMAL(10,2) NOT NULL,
    ends_per_inch INT NOT NULL,
    crimp_percent DECIMAL(5,2) DEFAULT 0,
    yarn_rate_per_kg DECIMAL(10,2) NOT NULL,
    warp_weight_grams DECIMAL(10,2),
    warp_cost DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS public.cost_sheet_weft (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_sheet_id UUID REFERENCES public.cost_sheets(id) ON DELETE CASCADE,
    yarn_name VARCHAR(150) NOT NULL,
    denier_count DECIMAL(10,2) NOT NULL,
    picks_per_inch INT NOT NULL,
    crimp_percent DECIMAL(5,2) DEFAULT 0,
    yarn_rate_per_kg DECIMAL(10,2) NOT NULL,
    weft_weight_grams DECIMAL(10,2),
    weft_cost DECIMAL(10,2)
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTION & LOOM PLANNING MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.looms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loom_number VARCHAR(50) NOT NULL UNIQUE,
    shed_name VARCHAR(100) NOT NULL,
    reed_space DECIMAL(10,2),
    rpm INT NOT NULL,
    assigned_quality VARCHAR(150),
    status VARCHAR(30) DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'IDLE', 'BREAKDOWN', 'MAINTENANCE')),
    efficiency_percent DECIMAL(5,2) DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    party_name VARCHAR(200) NOT NULL,
    fabric_quality VARCHAR(150) NOT NULL,
    target_meters DECIMAL(12,2) NOT NULL,
    produced_meters DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    delivery_date DATE,
    status VARCHAR(30) DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_production_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE NOT NULL,
    loom_id UUID REFERENCES public.looms(id) ON DELETE CASCADE,
    shift VARCHAR(20) CHECK (shift IN ('DAY', 'NIGHT')),
    pick_count INT NOT NULL,
    produced_meters DECIMAL(10,2) NOT NULL,
    efficiency_percent DECIMAL(5,2) NOT NULL,
    operator_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. INVENTORY & WAREHOUSING MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.yarn_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yarn_name VARCHAR(150) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    available_stock_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
    allocated_stock_kg DECIMAL(10,2) DEFAULT 0,
    reorder_level_kg DECIMAL(10,2) DEFAULT 500,
    warehouse_location VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fabric_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    quality_name VARCHAR(150) NOT NULL,
    shade VARCHAR(50) NOT NULL,
    meters DECIMAL(10,2) NOT NULL,
    grade VARCHAR(10) CHECK (grade IN ('FRESH', 'SECOND', 'DEFECTIVE')),
    status VARCHAR(30) DEFAULT 'READY' CHECK (status IN ('READY', 'QUALITY_HOLD', 'DISPATCHED', 'REJECTED')),
    warehouse_location VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. SALES & DISPATCH MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_no VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    order_date DATE NOT NULL,
    quality_name VARCHAR(150) NOT NULL,
    total_meters DECIMAL(10,2) NOT NULL,
    rate_per_meter DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    dispatched_meters DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'PARTIAL_DISPATCH', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_note_no VARCHAR(50) NOT NULL UNIQUE,
    sales_order_no VARCHAR(50) REFERENCES public.sales_orders(sales_order_no),
    customer_name VARCHAR(200) NOT NULL,
    dispatch_date DATE NOT NULL,
    transport_name VARCHAR(150),
    lr_number VARCHAR(100),
    total_rolls INT NOT NULL,
    total_meters DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'IN_TRANSIT' CHECK (status IN ('PACKED', 'IN_TRANSIT', 'DELIVERED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. QUALITY CONTROL (4-POINT INSPECTION) MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fabric_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_no VARCHAR(50) NOT NULL UNIQUE,
    roll_number VARCHAR(50) REFERENCES public.fabric_inventory(roll_number),
    quality_name VARCHAR(150) NOT NULL,
    total_meters DECIMAL(10,2) NOT NULL,
    total_penalty_points INT DEFAULT 0,
    points_per_100_sq_yards DECIMAL(5,2) DEFAULT 0,
    grade VARCHAR(10) CHECK (grade IN ('PASS', 'HOLD', 'FAIL')),
    inspector_name VARCHAR(100),
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. WHATSAPP BOT INTEGRATION MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    weaveone_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender_phone VARCHAR(20) NOT NULL,
    sender_name VARCHAR(150),
    sender_role VARCHAR(50),
    raw_command TEXT NOT NULL,
    parsed_category VARCHAR(50),
    response_text TEXT,
    execution_status VARCHAR(30) DEFAULT 'SUCCESS' CHECK (execution_status IN ('SUCCESS', 'UNAUTHORIZED', 'SYNTAX_ERROR', 'SERVER_ERROR'))
);

-- -----------------------------------------------------------------------------
-- SEED INITIAL SYSTEM ROLES & ADMIN USER
-- -----------------------------------------------------------------------------

INSERT INTO public.roles (id, name, description, is_system, permissions)
VALUES 
    ('role-superadmin', 'Super Admin', 'Unrestricted access to all ERP modules, user governance, security audit logs, and approval queues.', TRUE, '{"users.view": true, "users.create": true, "users.approve": true, "costing.approve": true, "production.approve": true, "quality.override": true}'::jsonb),
    ('role-admin', 'Admin', 'Full management access across business operations, user management, and module administration.', TRUE, '{"users.view": true, "users.create": true, "users.approve": true, "costing.approve": true}'::jsonb),
    ('role-costing', 'Costing Executive', 'Prepare and calculate yarn cost sheets, warp & weft consumption, and feeder colourways.', TRUE, '{"costing.view": true, "costing.create": true, "masters.view": true}'::jsonb),
    ('role-production-mgr', 'Production Manager', 'Manage loom assignments, daily production logs, job cards, and beam allocations.', TRUE, '{"production.view": true, "production.create": true, "production.approve": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, first_name, last_name, mobile, employee_id, department, designation, primary_role_id, status, approval_status, creation_method)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@weaveone.com', 'WeaveOne Admin', 'Rajesh', 'Shah', '+919876543210', 'EMP-001', 'Management', 'Managing Director', 'role-superadmin', 'ACTIVE', 'ADMIN_APPROVED', 'ADMIN_CREATED'),
    ('00000000-0000-0000-0000-000000000002', 'user@weaveone.com', 'WeaveOne Standard User', 'Standard', 'User', '+919825012345', 'EMP-002', 'Costing & Design', 'Senior Costing Executive', 'role-costing', 'ACTIVE', 'ADMIN_APPROVED', 'ADMIN_CREATED')
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. WAREHOUSE MASTER & LOCATION HIERARCHY MODULE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_code VARCHAR(50) NOT NULL UNIQUE, -- e.g. WH-01, WH-02
    warehouse_name VARCHAR(200) NOT NULL,
    warehouse_type VARCHAR(100) NOT NULL DEFAULT 'General',
    warehouse_type_other VARCHAR(200),
    address_line_1 TEXT,
    address_line_2 TEXT,
    area VARCHAR(150),
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    contact_person VARCHAR(150),
    mobile VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(150),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Deactive')),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON public.warehouses(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON public.warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON public.warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_city ON public.warehouses(city);

CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    location_code VARCHAR(50) NOT NULL, -- e.g. LOC-01, LOC-02
    location_name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Deactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_warehouse_location_code UNIQUE (warehouse_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON public.warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON public.warehouse_locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.warehouse_locations(status);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) CONFIGURATION FOR PUBLIC ERP DATA ACCESS
-- -----------------------------------------------------------------------------
-- Disable RLS on public tables to allow direct sync from frontend / anon key
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_sub_parties DISABLE ROW LEVEL SECURITY;

-- Complete Schema Successfully Created
