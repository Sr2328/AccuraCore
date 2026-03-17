
-- Fix search_path on all trigger functions
CREATE OR REPLACE FUNCTION public.calc_attendance_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_store_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.generate_job_doc_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.generate_rm_req_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
