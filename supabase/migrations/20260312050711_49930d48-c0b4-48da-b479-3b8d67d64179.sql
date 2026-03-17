
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM (
  'admin', 'hr', 'security', 'procurement', 'employee',
  'toolroom_high', 'moulding_high', 'ref_person', 'store',
  'accountant', 'cad_cam', 'tool_room_head'
);

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_custom text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  department_id uuid REFERENCES public.departments(id),
  designation text,
  shift text DEFAULT 'General',
  joining_date date,
  basic_salary numeric DEFAULT 0,
  profile_pic_url text,
  phone text,
  aadhaar text,
  pan text,
  uan text,
  bank_account text,
  bank_ifsc text,
  esi_number text,
  address text,
  emergency_contact text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  day_of_week text,
  in_time timestamptz,
  out_time timestamptz,
  total_hours numeric,
  marked_by uuid REFERENCES auth.users(id),
  employee_approved boolean DEFAULT false,
  approved_at timestamptz,
  is_locked boolean DEFAULT false,
  status text DEFAULT 'pending',
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Gate passes
CREATE TABLE public.gate_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pass_type text NOT NULL DEFAULT 'return',
  reason text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approval_status text DEFAULT 'pending',
  out_time timestamptz,
  return_time timestamptz,
  employee_return_approved boolean DEFAULT false,
  status text DEFAULT 'created',
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Canteen logs
CREATE TABLE public.canteen_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  marked_by uuid REFERENCES auth.users(id),
  employee_approved boolean DEFAULT false,
  approved_at timestamptz,
  meal_type text DEFAULT 'lunch',
  created_at timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  gst_number text,
  contact_person text,
  phone text,
  whatsapp text,
  email text,
  category text,
  nature_of_supply text,
  tat_days integer DEFAULT 5,
  payment_terms text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job Work
CREATE TABLE public.job_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no text UNIQUE,
  division text NOT NULL DEFAULT 'toolroom',
  process_type text,
  supplier_id uuid REFERENCES public.suppliers(id),
  material_name text NOT NULL,
  material_grade text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs',
  dispatch_purpose text,
  responsible_person text,
  expected_return_date date,
  dispatch_mode text,
  delivery_person_name text,
  vehicle_number text,
  dispatch_date timestamptz,
  return_date timestamptz,
  received_qty numeric,
  balance_qty numeric,
  current_step integer DEFAULT 1,
  status text DEFAULT 'requirement_received',
  ref_person_id uuid REFERENCES auth.users(id),
  ref_person_approved boolean,
  ref_person_remarks text,
  high_authority_id uuid REFERENCES auth.users(id),
  high_authority_approved boolean,
  high_authority_remarks text,
  invoice_number text,
  invoice_url text,
  challan_url text,
  requirement_doc_url text,
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job Work Communications
CREATE TABLE public.job_work_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_work_id uuid REFERENCES public.job_work(id) ON DELETE CASCADE NOT NULL,
  communication_type text NOT NULL,
  contact_person text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RM Buying
CREATE TABLE public.rm_buying (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_no text UNIQUE,
  material_name text NOT NULL,
  material_grade text,
  material_size text,
  quantity numeric NOT NULL,
  unit text DEFAULT 'kg',
  category text,
  current_step integer DEFAULT 1,
  status text DEFAULT 'requirement_created',
  selected_supplier_id uuid REFERENCES public.suppliers(id),
  po_number text,
  po_date date,
  expected_delivery_date date,
  received_qty numeric,
  invoice_number text,
  invoice_url text,
  high_authority_id uuid REFERENCES auth.users(id),
  high_authority_approved boolean,
  high_authority_remarks text,
  remarks text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RM Buying Rate Comparison
CREATE TABLE public.rm_buying_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rm_buying_id uuid REFERENCES public.rm_buying(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) NOT NULL,
  rate_per_unit numeric,
  availability text,
  lead_time_days integer,
  gst_percent numeric,
  is_recommended boolean DEFAULT false,
  slip_sent boolean DEFAULT false,
  slip_sent_via text,
  created_at timestamptz DEFAULT now()
);

-- Store Items
CREATE TABLE public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text UNIQUE,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pcs',
  current_qty numeric DEFAULT 0,
  min_stock_level numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  rack_location text,
  supplier_id uuid REFERENCES public.suppliers(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock Movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  person_name text,
  department text,
  purpose text,
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Procurement Tasks
CREATE TABLE public.procurement_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  related_type text,
  related_id uuid,
  priority text DEFAULT 'medium',
  due_date date,
  status text DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Notes
CREATE TABLE public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.procurement_tasks(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  type text DEFAULT 'announcement',
  target_type text DEFAULT 'all',
  target_department_id uuid REFERENCES public.departments(id),
  target_user_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Notification reads
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES auth.users(id) NOT NULL,
  to_user_id uuid REFERENCES auth.users(id),
  to_department_id uuid REFERENCES public.departments(id),
  subject text NOT NULL,
  body text,
  attachment_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Complaints
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  subject text NOT NULL,
  description text,
  attachment_url text,
  is_anonymous boolean DEFAULT false,
  submitted_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'submitted',
  resolution_remarks text,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leave requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_type text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  remarks text,
  created_at timestamptz DEFAULT now()
);

-- Canteen settings
CREATE TABLE public.canteen_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lunch_rate_per_day numeric NOT NULL DEFAULT 50,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  set_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Auto-calculate total hours on attendance
CREATE OR REPLACE FUNCTION public.calc_attendance_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.in_time IS NOT NULL AND NEW.out_time IS NOT NULL THEN
    NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.out_time - NEW.in_time)) / 3600.0, 2);
  END IF;
  NEW.day_of_week := TO_CHAR(NEW.date, 'Day');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER calc_hours
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_attendance_hours();

-- Update store stock on movement
CREATE OR REPLACE FUNCTION public.update_store_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.store_items SET current_qty = current_qty + NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSE
    UPDATE public.store_items SET current_qty = GREATEST(current_qty - NEW.quantity, 0), updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stock_movement_trigger
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_stock();

-- Auto-generate item codes
CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  seq integer;
BEGIN
  prefix := COALESCE(
    CASE NEW.category
      WHEN 'Steel' THEN 'STL'
      WHEN 'Electrical' THEN 'ELC'
      WHEN 'Consumables' THEN 'CON'
      WHEN 'Tools' THEN 'TOL'
      WHEN 'Stationery' THEN 'STN'
      ELSE 'GEN'
    END, 'GEN'
  );
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM 5) AS integer)), 0) + 1
  INTO seq
  FROM public.store_items
  WHERE item_code LIKE prefix || '-%';
  NEW.item_code := prefix || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_item_code
  BEFORE INSERT ON public.store_items
  FOR EACH ROW
  WHEN (NEW.item_code IS NULL)
  EXECUTE FUNCTION public.generate_item_code();

-- Auto-generate job work doc numbers
CREATE OR REPLACE FUNCTION public.generate_job_doc_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seq integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(doc_no FROM 9) AS integer)), 0) + 1
  INTO seq
  FROM public.job_work
  WHERE doc_no LIKE 'JW-' || TO_CHAR(NOW(), 'YYYY') || '-%';
  NEW.doc_no := 'JW-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_job_doc_no
  BEFORE INSERT ON public.job_work
  FOR EACH ROW
  WHEN (NEW.doc_no IS NULL)
  EXECUTE FUNCTION public.generate_job_doc_no();

-- Auto-generate RM requirement numbers
CREATE OR REPLACE FUNCTION public.generate_rm_req_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seq integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(requirement_no FROM 9) AS integer)), 0) + 1
  INTO seq
  FROM public.rm_buying
  WHERE requirement_no LIKE 'RM-' || TO_CHAR(NOW(), 'YYYY') || '-%';
  NEW.requirement_no := 'RM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_rm_req_no
  BEFORE INSERT ON public.rm_buying
  FOR EACH ROW
  WHEN (NEW.requirement_no IS NULL)
  EXECUTE FUNCTION public.generate_rm_req_no();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_work_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_buying ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_buying_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Departments
CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update departments" ON public.departments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Attendance
CREATE POLICY "View attendance" ON public.attendance FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'security')
);
CREATE POLICY "Insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'security') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update attendance" ON public.attendance FOR UPDATE TO authenticated USING (
  (employee_id = auth.uid() AND is_locked = false) OR
  (public.has_role(auth.uid(), 'security') AND employee_approved = false) OR
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Gate passes
CREATE POLICY "View gate passes" ON public.gate_passes FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'security')
);
CREATE POLICY "Create gate passes" ON public.gate_passes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'security') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update gate passes" ON public.gate_passes FOR UPDATE TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'security') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Canteen logs
CREATE POLICY "View canteen logs" ON public.canteen_logs FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'security')
);
CREATE POLICY "Create canteen logs" ON public.canteen_logs FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'security') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update canteen logs" ON public.canteen_logs FOR UPDATE TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Suppliers
CREATE POLICY "View suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement')
);
CREATE POLICY "Update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement')
);
CREATE POLICY "Delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Job work
CREATE POLICY "View job work" ON public.job_work FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create job work" ON public.job_work FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update job work" ON public.job_work FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'toolroom_high') OR public.has_role(auth.uid(), 'moulding_high') OR
  public.has_role(auth.uid(), 'ref_person') OR public.has_role(auth.uid(), 'security')
);

-- Job work communications
CREATE POLICY "View job work comms" ON public.job_work_communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create job work comms" ON public.job_work_communications FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);

-- RM Buying
CREATE POLICY "View rm buying" ON public.rm_buying FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create rm buying" ON public.rm_buying FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store')
);
CREATE POLICY "Update rm buying" ON public.rm_buying FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'toolroom_high') OR public.has_role(auth.uid(), 'moulding_high')
);

-- RM Buying rates
CREATE POLICY "View rm rates" ON public.rm_buying_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert rm rates" ON public.rm_buying_rates FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update rm rates" ON public.rm_buying_rates FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);

-- Store items
CREATE POLICY "View store items" ON public.store_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert store items" ON public.store_items FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'store') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update store items" ON public.store_items FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'store') OR public.has_role(auth.uid(), 'admin')
);

-- Stock movements
CREATE POLICY "View stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create stock movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'store') OR public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);

-- Procurement tasks
CREATE POLICY "View procurement tasks" ON public.procurement_tasks FOR SELECT TO authenticated USING (
  assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Insert procurement tasks" ON public.procurement_tasks FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update procurement tasks" ON public.procurement_tasks FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'procurement') OR public.has_role(auth.uid(), 'admin')
);

-- Task notes
CREATE POLICY "View task notes" ON public.task_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create task notes" ON public.task_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- Notifications
CREATE POLICY "View notifications" ON public.notifications FOR SELECT TO authenticated USING (
  target_type = 'all' OR target_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Notification reads
CREATE POLICY "Own notification reads" ON public.notification_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert notification reads" ON public.notification_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Messages
CREATE POLICY "View own messages" ON public.messages FOR SELECT TO authenticated USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Update messages" ON public.messages FOR UPDATE TO authenticated USING (to_user_id = auth.uid());

-- Complaints
CREATE POLICY "View complaints" ON public.complaints FOR SELECT TO authenticated USING (
  submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);
CREATE POLICY "Submit complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Update complaints" ON public.complaints FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Leave requests
CREATE POLICY "View leaves" ON public.leave_requests FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);
CREATE POLICY "Submit leave" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Approve leaves" ON public.leave_requests FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Canteen settings
CREATE POLICY "View canteen settings" ON public.canteen_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage canteen settings" ON public.canteen_settings FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);
CREATE POLICY "Update canteen settings" ON public.canteen_settings FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_passes;

-- Insert default departments
INSERT INTO public.departments (name) VALUES
  ('Management'), ('Human Resources'), ('Security'), ('Procurement'),
  ('Tool Room'), ('Moulding'), ('QC'), ('CNC'), ('Design'),
  ('Maintenance'), ('Store'), ('Accounts'), ('CAD/CAM');
