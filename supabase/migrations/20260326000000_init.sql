


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_cost_of_living_by_admin"("target_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from cost_of_living where id = target_item_id;
end;
$$;


ALTER FUNCTION "public"."delete_cost_of_living_by_admin"("target_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_non_recurring_expense_by_admin"("target_expense_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.non_recurring_expenses
    WHERE id = target_expense_id;
END;
$$;


ALTER FUNCTION "public"."delete_non_recurring_expense_by_admin"("target_expense_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get caller role from JWT (optimized, no recursion)
  caller_role := auth.jwt() -> 'app_metadata' ->> 'role';

  IF caller_role NOT IN ('ADMIN', 'SECRETARY') THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_anamnesis_by_admin"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  select row_to_json(n) into result
  from anamnese n
  where n.user_id = target_user_id
  order by created_at desc
  limit 1;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_anamnesis_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cost_of_living_by_admin"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return (
    select json_agg(c.*)
    from cost_of_living c
    where c.user_id = target_user_id
  );
end;
$$;


ALTER FUNCTION "public"."get_cost_of_living_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_debt_mapping_by_admin"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  select json_build_object(
    'items', d.items,
    'updated_at', d.updated_at
  ) into result
  from debt_mappings d
  where d.user_id = target_user_id;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_debt_mapping_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_diagnostic_by_admin"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  select json_build_object(
    'data', d.data,
    'updated_at', d.updated_at
  ) into result
  from diagnostics d
  where d.user_id = target_user_id;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_diagnostic_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mentorship_state_by_admin"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    meetings JSONB;
    expenses JSONB;
BEGIN
    SELECT jsonb_agg(mm) INTO meetings
    FROM public.mentorship_meetings mm
    WHERE mm.user_id = target_user_id;

    SELECT jsonb_agg(nre) INTO expenses
    FROM public.non_recurring_expenses nre
    WHERE nre.user_id = target_user_id;

    RETURN jsonb_build_object(
        'meetings', COALESCE(meetings, '[]'::jsonb),
        'nonRecurringExpenses', COALESCE(expenses, '[]'::jsonb)
    );
END;
$$;


ALTER FUNCTION "public"."get_mentorship_state_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_intake"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'main_problem', main_problem,
    'resolution_attempts', resolution_attempts,
    'details', details,
    'updated_at', updated_at
  ) INTO result
  FROM user_intakes
  WHERE user_id = target_user_id;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_intake"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, whatsapp, role, status, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'whatsapp',
    COALESCE(new.raw_user_meta_data->>'role', 'USER'),
    'NEW',
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_secretary"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SECRETARY')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_secretary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_anamnesis_by_admin"("target_user_id" "uuid", "reason" "text", "objectives" "text", "spends_all" boolean, "emergency_fund" boolean, "investments" boolean, "invests_monthly" boolean, "retirement_plan" boolean, "independent_decisions" boolean, "financial_score" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into anamnese (
    user_id, reason, objectives, spends_all, emergency_fund, 
    investments, invests_monthly, retirement_plan, 
    independent_decisions, financial_score
  )
  values (
    target_user_id, reason, objectives, spends_all, emergency_fund, 
    investments, invests_monthly, retirement_plan, 
    independent_decisions, financial_score
  )
  on conflict (user_id)
  do update set 
    reason = excluded.reason,
    objectives = excluded.objectives,
    spends_all = excluded.spends_all,
    emergency_fund = excluded.emergency_fund,
    investments = excluded.investments,
    invests_monthly = excluded.invests_monthly,
    retirement_plan = excluded.retirement_plan,
    independent_decisions = excluded.independent_decisions,
    financial_score = excluded.financial_score,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."save_anamnesis_by_admin"("target_user_id" "uuid", "reason" "text", "objectives" "text", "spends_all" boolean, "emergency_fund" boolean, "investments" boolean, "invests_monthly" boolean, "retirement_plan" boolean, "independent_decisions" boolean, "financial_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if item_id is not null then
    update cost_of_living
    set category = save_cost_of_living_by_admin.category,
        description = save_cost_of_living_by_admin.description,
        value = save_cost_of_living_by_admin.value
    where id = item_id and user_id = target_user_id;
  else
    insert into cost_of_living (user_id, category, description, value)
    values (target_user_id, category, description, value);
  end if;
end;
$$;


ALTER FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric, "is_installment" boolean DEFAULT false, "installments_count" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF item_id IS NOT NULL THEN
        UPDATE cost_of_living
        SET 
            category = save_cost_of_living_by_admin.category,
            description = save_cost_of_living_by_admin.description,
            value = save_cost_of_living_by_admin.value,
            is_installment = save_cost_of_living_by_admin.is_installment,
            installments_count = save_cost_of_living_by_admin.installments_count,
            created_at = NOW()
        WHERE id = item_id AND user_id = target_user_id;
    ELSE
        INSERT INTO cost_of_living (user_id, category, description, value, is_installment, installments_count)
        VALUES (target_user_id, category, description, value, is_installment, installments_count);
    END IF;
END;
$$;


ALTER FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric, "is_installment" boolean, "installments_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_debt_mapping_by_admin"("target_user_id" "uuid", "new_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into debt_mappings (user_id, items, updated_at)
  values (target_user_id, new_items, now())
  on conflict (user_id)
  do update set 
    items = excluded.items,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."save_debt_mapping_by_admin"("target_user_id" "uuid", "new_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_diagnostic_by_admin"("target_user_id" "uuid", "new_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Verifica se o usuário que chamou é ADMIN ou SECRETARY (via profiles)
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('ADMIN', 'SECRETARY')
  ) then
    raise exception 'Acesso negado. Apenas administradores podem realizar esta operação.';
  end if;

  -- Realiza o upsert na tabela diagnostics
  insert into public.diagnostics (user_id, data, updated_at)
  values (target_user_id, new_data, now())
  on conflict (user_id)
  do update set
    data = excluded.data,
    updated_at = excluded.updated_at;
end;
$$;


ALTER FUNCTION "public"."save_diagnostic_by_admin"("target_user_id" "uuid", "new_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_user_intake"("target_user_id" "uuid", "p_main_problem" "text", "p_resolution_attempts" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSONB;
BEGIN
    INSERT INTO user_intakes (user_id, main_problem, resolution_attempts, details, updated_at)
    VALUES (target_user_id, p_main_problem, p_resolution_attempts, p_details, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        main_problem = EXCLUDED.main_problem,
        resolution_attempts = EXCLUDED.resolution_attempts,
        details = EXCLUDED.details,
        updated_at = NOW()
    RETURNING to_jsonb(user_intakes.*) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."save_user_intake"("target_user_id" "uuid", "p_main_problem" "text", "p_resolution_attempts" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_role_to_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_role_to_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_meeting_status_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.mentorship_meetings
    SET 
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE completed_at END
    WHERE user_id = target_user_id AND meeting_id = target_meeting_id;

    -- If no row exists, we might want to insert? usually status update implies existence.
    -- If it doesn't exist, we can ignore or raise error. 
    -- For mentorship, usually the meeting row is created when saving data.
    IF NOT FOUND THEN
        INSERT INTO public.mentorship_meetings (user_id, meeting_id, status, data, started_at, completed_at)
        VALUES (
            target_user_id, 
            target_meeting_id, 
            new_status, 
            '{}'::jsonb, 
            NOW(), 
            CASE WHEN new_status = 'completed' THEN NOW() ELSE NULL END
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_meeting_status_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_email_by_admin"("target_user_id" "uuid", "new_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := auth.jwt() -> 'app_metadata' ->> 'role';

  IF caller_role NOT IN ('ADMIN', 'SECRETARY') THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can update emails.';
  END IF;

  UPDATE auth.users
  SET email = new_email, updated_at = now()
  WHERE id = target_user_id;
  
  -- Profile update is handled by app or manual sync, but let's force it here too just in case
  UPDATE public.profiles
  SET email = new_email
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_email_by_admin"("target_user_id" "uuid", "new_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_mentorship_meeting_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.mentorship_meetings (user_id, meeting_id, data)
    VALUES (target_user_id, target_meeting_id, new_data)
    ON CONFLICT (user_id, meeting_id) 
    DO UPDATE SET 
        data = EXCLUDED.data,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_mentorship_meeting_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_non_recurring_expense_by_admin"("target_user_id" "uuid", "expense_category" "text", "expense_description" "text", "expense_value" numeric, "expense_frequency" integer, "expense_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF expense_id IS NOT NULL THEN
        UPDATE public.non_recurring_expenses
        SET category = expense_category,
            description = expense_description,
            value = expense_value,
            frequency = expense_frequency
        WHERE id = expense_id;
    ELSE
        INSERT INTO public.non_recurring_expenses (user_id, category, description, value, frequency)
        VALUES (target_user_id, expense_category, expense_description, expense_value, expense_frequency);
    END IF;
END;
$$;


ALTER FUNCTION "public"."upsert_non_recurring_expense_by_admin"("target_user_id" "uuid", "expense_category" "text", "expense_description" "text", "expense_value" numeric, "expense_frequency" integer, "expense_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anamnese" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "objectives" "text",
    "spends_all" boolean,
    "emergency_fund" boolean,
    "investments" boolean,
    "invests_monthly" boolean,
    "retirement_plan" boolean,
    "independent_decisions" boolean,
    "financial_score" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anamnese" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_of_living" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "value" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_installment" boolean DEFAULT false,
    "installments_count" integer DEFAULT 1
);


ALTER TABLE "public"."cost_of_living" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debt_mappings" (
    "user_id" "uuid" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."debt_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diagnostics" (
    "user_id" "uuid" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."diagnostics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentorship_meetings" (
    "user_id" "uuid" NOT NULL,
    "meeting_id" integer NOT NULL,
    "status" "text" DEFAULT 'locked'::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mentorship_meetings_status_check" CHECK (("status" = ANY (ARRAY['locked'::"text", 'unlocked'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."mentorship_meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."non_recurring_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "value" numeric NOT NULL,
    "frequency" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."non_recurring_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "whatsapp" "text",
    "role" "text" DEFAULT 'USER'::"text",
    "status" "text" DEFAULT 'NEW'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_contacted_by" "text",
    "email" "text",
    "checklist_available" boolean DEFAULT false,
    "checklist_progress" "jsonb" DEFAULT '[]'::"jsonb",
    "checklist_data" "jsonb" DEFAULT '{}'::"jsonb",
    "checklist_phase" "text" DEFAULT 'LOCKED'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text", 'USER'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['NEW'::"text", 'ACTIVE'::"text", 'CONTACTED'::"text", 'CONVERTED'::"text", 'LOST'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_intakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "main_problem" "text",
    "resolution_attempts" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "details" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."user_intakes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anamnese"
    ADD CONSTRAINT "anamnese_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_of_living"
    ADD CONSTRAINT "cost_of_living_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debt_mappings"
    ADD CONSTRAINT "debt_mappings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."mentorship_meetings"
    ADD CONSTRAINT "mentorship_meetings_pkey" PRIMARY KEY ("user_id", "meeting_id");



ALTER TABLE ONLY "public"."non_recurring_expenses"
    ADD CONSTRAINT "non_recurring_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_intakes"
    ADD CONSTRAINT "user_intakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_intakes"
    ADD CONSTRAINT "user_intakes_user_id_key" UNIQUE ("user_id");



CREATE OR REPLACE TRIGGER "on_profile_role_change" AFTER INSERT OR UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_role_to_metadata"();



ALTER TABLE ONLY "public"."anamnese"
    ADD CONSTRAINT "anamnese_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_of_living"
    ADD CONSTRAINT "cost_of_living_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_mappings"
    ADD CONSTRAINT "debt_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diagnostics"
    ADD CONSTRAINT "diagnostics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentorship_meetings"
    ADD CONSTRAINT "mentorship_meetings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."non_recurring_expenses"
    ADD CONSTRAINT "non_recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_intakes"
    ADD CONSTRAINT "user_intakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and Secretaries can delete profiles" ON "public"."profiles" FOR DELETE USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"])));



CREATE POLICY "Admins and Secretaries can update all diagnostics" ON "public"."diagnostics" FOR UPDATE USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"])));



CREATE POLICY "Admins and Secretaries can update all profiles" ON "public"."profiles" FOR UPDATE USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"])));



CREATE POLICY "Admins and Secretaries can view all diagnostics" ON "public"."diagnostics" FOR SELECT USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"])));



CREATE POLICY "Admins and Secretaries can view all profiles" ON "public"."profiles" FOR SELECT USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"])));



CREATE POLICY "Admins can view all debt mappings" ON "public"."debt_mappings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['ADMIN'::"text", 'SECRETARY'::"text"]))))));



CREATE POLICY "Users can allow delete for own rows" ON "public"."cost_of_living" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can allow insert for own rows" ON "public"."cost_of_living" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can allow select for own rows" ON "public"."cost_of_living" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can allow update for own rows" ON "public"."cost_of_living" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own non_recurring_expenses" ON "public"."non_recurring_expenses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own debt mapping" ON "public"."debt_mappings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own anamnesis" ON "public"."anamnese" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own mentorship_meetings" ON "public"."mentorship_meetings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own non_recurring_expenses" ON "public"."non_recurring_expenses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select their own mentorship_meetings" ON "public"."mentorship_meetings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select their own non_recurring_expenses" ON "public"."non_recurring_expenses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own debt mapping" ON "public"."debt_mappings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own diagnostic" ON "public"."diagnostics" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own diagnostic (UP)" ON "public"."diagnostics" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own anamnesis" ON "public"."anamnese" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own mentorship_meetings" ON "public"."mentorship_meetings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own non_recurring_expenses" ON "public"."non_recurring_expenses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own debt mapping" ON "public"."debt_mappings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own diagnostic" ON "public"."diagnostics" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own anamnesis" ON "public"."anamnese" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."anamnese" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_of_living" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debt_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diagnostics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentorship_meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."non_recurring_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_intakes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."delete_cost_of_living_by_admin"("target_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_cost_of_living_by_admin"("target_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_cost_of_living_by_admin"("target_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_non_recurring_expense_by_admin"("target_expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_non_recurring_expense_by_admin"("target_expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_non_recurring_expense_by_admin"("target_expense_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_anamnesis_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_anamnesis_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_anamnesis_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cost_of_living_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cost_of_living_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cost_of_living_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_debt_mapping_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_debt_mapping_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_debt_mapping_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_diagnostic_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_diagnostic_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_diagnostic_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mentorship_state_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_mentorship_state_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mentorship_state_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_intake"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_intake"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_intake"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_secretary"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_secretary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_secretary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."save_anamnesis_by_admin"("target_user_id" "uuid", "reason" "text", "objectives" "text", "spends_all" boolean, "emergency_fund" boolean, "investments" boolean, "invests_monthly" boolean, "retirement_plan" boolean, "independent_decisions" boolean, "financial_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_anamnesis_by_admin"("target_user_id" "uuid", "reason" "text", "objectives" "text", "spends_all" boolean, "emergency_fund" boolean, "investments" boolean, "invests_monthly" boolean, "retirement_plan" boolean, "independent_decisions" boolean, "financial_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_anamnesis_by_admin"("target_user_id" "uuid", "reason" "text", "objectives" "text", "spends_all" boolean, "emergency_fund" boolean, "investments" boolean, "invests_monthly" boolean, "retirement_plan" boolean, "independent_decisions" boolean, "financial_score" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric, "is_installment" boolean, "installments_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric, "is_installment" boolean, "installments_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_cost_of_living_by_admin"("target_user_id" "uuid", "item_id" "uuid", "category" "text", "description" "text", "value" numeric, "is_installment" boolean, "installments_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_debt_mapping_by_admin"("target_user_id" "uuid", "new_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_debt_mapping_by_admin"("target_user_id" "uuid", "new_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_debt_mapping_by_admin"("target_user_id" "uuid", "new_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_diagnostic_by_admin"("target_user_id" "uuid", "new_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_diagnostic_by_admin"("target_user_id" "uuid", "new_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_diagnostic_by_admin"("target_user_id" "uuid", "new_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_user_intake"("target_user_id" "uuid", "p_main_problem" "text", "p_resolution_attempts" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_user_intake"("target_user_id" "uuid", "p_main_problem" "text", "p_resolution_attempts" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_user_intake"("target_user_id" "uuid", "p_main_problem" "text", "p_resolution_attempts" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_role_to_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_role_to_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_role_to_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_meeting_status_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_meeting_status_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_meeting_status_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_email_by_admin"("target_user_id" "uuid", "new_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_email_by_admin"("target_user_id" "uuid", "new_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_email_by_admin"("target_user_id" "uuid", "new_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_mentorship_meeting_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_mentorship_meeting_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_mentorship_meeting_by_admin"("target_user_id" "uuid", "target_meeting_id" integer, "new_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_non_recurring_expense_by_admin"("target_user_id" "uuid", "expense_category" "text", "expense_description" "text", "expense_value" numeric, "expense_frequency" integer, "expense_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_non_recurring_expense_by_admin"("target_user_id" "uuid", "expense_category" "text", "expense_description" "text", "expense_value" numeric, "expense_frequency" integer, "expense_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_non_recurring_expense_by_admin"("target_user_id" "uuid", "expense_category" "text", "expense_description" "text", "expense_value" numeric, "expense_frequency" integer, "expense_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."anamnese" TO "anon";
GRANT ALL ON TABLE "public"."anamnese" TO "authenticated";
GRANT ALL ON TABLE "public"."anamnese" TO "service_role";



GRANT ALL ON TABLE "public"."cost_of_living" TO "anon";
GRANT ALL ON TABLE "public"."cost_of_living" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_of_living" TO "service_role";



GRANT ALL ON TABLE "public"."debt_mappings" TO "anon";
GRANT ALL ON TABLE "public"."debt_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."debt_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."diagnostics" TO "anon";
GRANT ALL ON TABLE "public"."diagnostics" TO "authenticated";
GRANT ALL ON TABLE "public"."diagnostics" TO "service_role";



GRANT ALL ON TABLE "public"."mentorship_meetings" TO "anon";
GRANT ALL ON TABLE "public"."mentorship_meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."mentorship_meetings" TO "service_role";



GRANT ALL ON TABLE "public"."non_recurring_expenses" TO "anon";
GRANT ALL ON TABLE "public"."non_recurring_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."non_recurring_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_intakes" TO "anon";
GRANT ALL ON TABLE "public"."user_intakes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_intakes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































