-- ==============================================================================
-- OHANA MAKIS POS - ESQUEMA DE BASE DE DATOS SUPABASE (SIN DATOS INICIALES)
-- Copia y pega todo este script en el "SQL Editor" de tu proyecto de Supabase
-- Proyecto: https://zcpcvdtzwvuotginbxsh.supabase.co
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: PERFILES DE USUARIOS (Vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN', -- 'ADMIN', 'CASHIER', 'CHEF', 'WAITER'
    phone VARCHAR(30),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columna avatar_url si la tabla ya había sido creada previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Trigger para crear automáticamente el perfil al registrar usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'ADMIN')
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger previo si existe para recrear limpiamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABLA: CATEGORÍAS (MAKIS, COMBOS, BEBIDAS, ETC.)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    portions VARCHAR(50) DEFAULT '10 cortes',
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: COMANDAS / ÓRDENES DE VENTA
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) DEFAULT 'Cliente General',
    customer_phone VARCHAR(30),
    modality VARCHAR(50) NOT NULL DEFAULT 'Mesa', -- 'Mesa', 'Llevar', 'Delivery'
    table_number VARCHAR(20),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Yape', -- 'Yape', 'Tarjeta (POS)', 'Efectivo', 'Transferencia'
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Pagado', -- 'En Preparación', 'Entregado', 'Pagado', 'Cancelado'
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: DETALLE DE ÓRDENES (ROLLS Y PRODUCTOS VENDIDOS)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    portion_detail VARCHAR(50),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: INVENTARIO DE INSUMOS CRÍTICOS
CREATE TABLE IF NOT EXISTS public.supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg', -- 'kg', 'hojas', 'unidades', 'litros'
    min_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Saludable',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA: GESTIÓN DE TURNOS Y CIERRES DE CAJA
CREATE TABLE IF NOT EXISTS public.cash_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) DEFAULT 'Cajero Principal',
    opening_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sales_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_general NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    closing_amount NUMERIC(10, 2) DEFAULT 0.00,
    difference NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Abierta', -- 'Abierta', 'Cerrada'
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

-- 10. TABLA: MOVIMIENTOS DE INGRESO Y EGRESO DE CAJA CHICA
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL, -- 'Ingreso', 'Egreso'
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    concept VARCHAR(200) NOT NULL,
    user_name VARCHAR(100) DEFAULT 'Cajero Principal',
    payment_method VARCHAR(50) DEFAULT 'Efectivo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE PERMISOS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para uso desde el frontend
CREATE POLICY "Permitir todo en profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Permitir todo en categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Permitir todo en products" ON public.products FOR ALL USING (true);
CREATE POLICY "Permitir todo en customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Permitir todo en orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Permitir todo en order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Permitir todo en supplies" ON public.supplies FOR ALL USING (true);
CREATE POLICY "Permitir todo en cash_shifts" ON public.cash_shifts FOR ALL USING (true);
CREATE POLICY "Permitir todo en cash_movements" ON public.cash_movements FOR ALL USING (true);

-- NOTA: Este esquema se encuentra completamente limpio, sin datos de prueba ni registros iniciales.
-- Podrás registrar tu primer usuario Administrador directamente desde la pantalla de login del sistema.
