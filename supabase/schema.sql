-- Staff Appraisal System — initial schema
-- Run in Supabase SQL Editor using a trusted project owner account.
-- Policy basis: Staff Appraisal & Performance Management Policy 2026-2027.
-- Important: this schema is a starter. Review the institution's final policy,
-- retention rules, staff categories and deployment threat model before production.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'coordinator', 'teacher', 'appraisal_authority');
create type public.record_status as enum ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'returned');
create type public.task_status as enum ('pending', 'in_progress', 'submitted', 'pending_review', 'completed', 'cancelled');
create type public.point_status as enum ('proposed', 'pending_review', 'approved', 'rejected', 'withdrawn');
create type public.evidence_confidence as enum ('limited', 'moderate', 'high');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  staff_code text unique,
  role public.app_role not null default 'teacher',
  department text,
  designation text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);
insert into public.academic_years (name, start_date, end_date, is_active)
values ('2026-2027', '2026-06-01', '2027-05-31', true)
on conflict (name) do nothing;

create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  coordinator_id uuid references public.profiles(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id),
  responsibility text,
  created_at timestamptz not null default now(),
  unique (staff_id, academic_year_id, responsibility)
);

create table public.appraisal_domains (
  code text primary key check (code in ('D1','D2','D3','D4','D5','D6','D7')),
  title text not null,
  weight numeric(5,2) not null check (weight > 0),
  sort_order int not null unique
);
insert into public.appraisal_domains(code,title,weight,sort_order) values
('D1','Teaching, Learning & Learner Achievement',25,1),
('D2','Student Mentoring, Wellbeing & Holistic Development',15,2),
('D3','Campus Engagement & Institutional Responsibilities',15,3),
('D4','Collaboration, Communication & Campus Community',10,4),
('D5','Personal & Professional Development, TPD, Research & Growth',10,5),
('D6','Professionalism, Reliability & Institutional Responsibility',15,6),
('D7','Academic Leadership, Governance & Institutional Contribution',10,7)
on conflict (code) do update set title=excluded.title, weight=excluded.weight, sort_order=excluded.sort_order;

create table public.appraisal_criteria (
  id uuid primary key default gen_random_uuid(),
  domain_code text not null references public.appraisal_domains(code),
  code text not null,
  title text not null,
  description text,
  weight numeric(5,2) not null check (weight > 0),
  sort_order int not null default 1,
  active boolean not null default true,
  unique(domain_code, code)
);

create table public.duty_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.duty_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  duty_type_id uuid references public.duty_types(id),
  title text not null,
  duty_date date not null,
  due_date date,
  status public.task_status not null default 'pending',
  staff_notes text,
  verifier_id uuid references public.profiles(id),
  verified_at timestamptz,
  verifier_notes text,
  academic_year_id uuid not null references public.academic_years(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.special_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Special task',
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  owner_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  due_date date,
  status public.task_status not null default 'pending',
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  academic_year_id uuid not null references public.academic_years(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_members (
  task_id uuid not null references public.special_tasks(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (task_id, staff_id)
);

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.special_tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  progress_percent int check (progress_percent between 0 and 100),
  status public.task_status,
  comment text,
  created_at timestamptz not null default now()
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles(id),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  category text not null,
  description text,
  confidence public.evidence_confidence not null default 'limited',
  duty_record_id uuid references public.duty_records(id) on delete set null,
  task_id uuid references public.special_tasks(id) on delete cascade,
  appraisal_id uuid,
  created_at timestamptz not null default now()
);

create table public.special_point_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  max_points numeric(6,2) not null check (max_points >= 0),
  active boolean not null default true,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.special_point_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id),
  task_id uuid references public.special_tasks(id) on delete set null,
  rule_id uuid references public.special_point_rules(id),
  proposed_by uuid not null references public.profiles(id),
  proposed_points numeric(6,2) not null check (proposed_points >= 0),
  approved_points numeric(6,2) check (approved_points is null or approved_points >= 0),
  contribution_summary text not null,
  impact_summary text,
  status public.point_status not null default 'proposed',
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  academic_year_id uuid not null references public.academic_years(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (approved_points is null or approved_points <= proposed_points)
);

create table public.appraisals (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id),
  academic_year_id uuid not null references public.academic_years(id),
  status public.record_status not null default 'draft',
  self_submitted_at timestamptz,
  supervisor_id uuid references public.profiles(id),
  supervisor_submitted_at timestamptz,
  authority_id uuid references public.profiles(id),
  authority_approved_at timestamptz,
  final_score numeric(6,2) check (final_score is null or final_score between 0 and 100),
  final_summary text,
  critical_concern_status text not null default 'none' check (critical_concern_status in ('none','review_required','formal_action')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(staff_id, academic_year_id)
);

alter table public.evidence_files
  add constraint evidence_appraisal_fk foreign key (appraisal_id) references public.appraisals(id) on delete cascade;

-- Protect final appraisal fields from staff/coordinator self-escalation.
-- RLS controls which rows are visible; this trigger protects sensitive columns.
create or replace function public.protect_appraisal_final_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and public.current_app_role() not in ('admin','appraisal_authority') then
    if new.final_score is distinct from old.final_score
       or new.authority_id is distinct from old.authority_id
       or new.authority_approved_at is distinct from old.authority_approved_at
       or new.critical_concern_status is distinct from old.critical_concern_status then
      raise exception 'Only Admin or Appraisal Authority may change final appraisal fields';
    end if;
    if new.status in ('approved') and old.status is distinct from new.status then
      raise exception 'Only Admin or Appraisal Authority may approve a final appraisal';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists protect_appraisal_final_fields_trigger on public.appraisals;
create trigger protect_appraisal_final_fields_trigger
before update on public.appraisals
for each row execute procedure public.protect_appraisal_final_fields();

create table public.appraisal_ratings (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  domain_code text not null references public.appraisal_domains(code),
  criterion_id uuid references public.appraisal_criteria(id),
  rating int check (rating between 1 and 5),
  is_not_applicable boolean not null default false,
  na_reason text,
  allocated_weight numeric(5,2) not null check (allocated_weight > 0),
  weighted_score numeric(6,2),
  comments text,
  rated_by uuid references public.profiles(id),
  evidence_confidence public.evidence_confidence,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_not_applicable and rating is null and na_reason is not null) or
         (not is_not_applicable and rating is not null))
);

create table public.self_assessments (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null unique references public.appraisals(id) on delete cascade,
  staff_reflection text,
  strengths text,
  development_priorities text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.review_meetings (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  meeting_date timestamptz,
  supervisor_id uuid references public.profiles(id),
  feedback_summary text,
  staff_response text,
  created_at timestamptz not null default now()
);

create table public.development_plans (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  priority text not null,
  action text not null,
  support_resource text,
  responsible_person uuid references public.profiles(id),
  target_date date,
  progress_evidence text,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  disputed_points text not null,
  supporting_evidence text,
  status public.record_status not null default 'submitted',
  reviewer_id uuid references public.profiles(id),
  decision text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

-- Helpers. SECURITY DEFINER avoids recursive RLS lookups on profiles.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_admin_or_authority()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin','appraisal_authority'), false);
$$;

create or replace function public.can_manage_staff(target_staff_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    public.current_app_role() in ('admin','appraisal_authority')
    or exists (
      select 1 from public.staff_assignments sa
      where sa.staff_id = target_staff_id and sa.coordinator_id = auth.uid()
    ), false
  );
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin_or_authority() to authenticated;
grant execute on function public.can_manage_staff(uuid) to authenticated;

-- New Auth users get a basic teacher profile. Admin should change roles only
-- after verifying identity and institutional authorisation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1), 'New user'),
    'teacher'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Prevent normal users from changing their own role or staff code.
create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_app_role() <> 'admin' then
    if new.role is distinct from old.role
       or new.staff_code is distinct from old.staff_code
       or new.active is distinct from old.active then
      raise exception 'Only an Admin may change role, staff code or active status';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
for each row execute procedure public.protect_profile_privileged_fields();

-- Enable RLS on all application tables.
alter table public.profiles enable row level security;
alter table public.academic_years enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.appraisal_domains enable row level security;
alter table public.appraisal_criteria enable row level security;
alter table public.duty_types enable row level security;
alter table public.duty_records enable row level security;
alter table public.special_tasks enable row level security;
alter table public.task_members enable row level security;
alter table public.task_updates enable row level security;
alter table public.evidence_files enable row level security;
alter table public.special_point_rules enable row level security;
alter table public.special_point_entries enable row level security;
alter table public.appraisals enable row level security;
alter table public.appraisal_ratings enable row level security;
alter table public.self_assessments enable row level security;
alter table public.review_meetings enable row level security;
alter table public.development_plans enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users see own profile; coordinators see assigned staff; admin/authority see all.
create policy "profiles_select_scoped" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(id));
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin')
with check (id = auth.uid() or public.current_app_role() = 'admin');
create policy "profiles_admin_insert" on public.profiles for insert to authenticated
with check (public.current_app_role() = 'admin');

create policy "years_authenticated_read" on public.academic_years for select to authenticated using (true);
create policy "years_admin_write" on public.academic_years for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "assignments_select_scoped" on public.staff_assignments for select to authenticated
using (staff_id = auth.uid() or coordinator_id = auth.uid() or public.is_admin_or_authority());
create policy "assignments_admin_write" on public.staff_assignments for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "assignments_coordinator_insert" on public.staff_assignments for insert to authenticated
with check (coordinator_id = auth.uid() and public.current_app_role() = 'coordinator');

create policy "domains_read" on public.appraisal_domains for select to authenticated using (true);
create policy "domains_admin_write" on public.appraisal_domains for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "criteria_read" on public.appraisal_criteria for select to authenticated using (true);
create policy "criteria_admin_write" on public.appraisal_criteria for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "duty_types_read" on public.duty_types for select to authenticated using (true);
create policy "duty_types_admin_coord_write" on public.duty_types for all to authenticated
using (public.current_app_role() in ('admin','coordinator'))
with check (public.current_app_role() in ('admin','coordinator'));

create policy "duties_select_scoped" on public.duty_records for select to authenticated
using (staff_id = auth.uid() or assigned_by = auth.uid() or verifier_id = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(staff_id));
create policy "duties_insert_scoped" on public.duty_records for insert to authenticated
with check (assigned_by = auth.uid() and public.current_app_role() in ('admin','coordinator'));
create policy "duties_update_scoped" on public.duty_records for update to authenticated
using (staff_id = auth.uid() or public.current_app_role() in ('admin','coordinator'))
with check (staff_id = auth.uid() or public.current_app_role() in ('admin','coordinator'));

create policy "tasks_select_scoped" on public.special_tasks for select to authenticated
using (owner_id = auth.uid() or assigned_by = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(owner_id)
  or exists(select 1 from public.task_members tm where tm.task_id = id and tm.staff_id = auth.uid()));
create policy "tasks_insert_admin_coord" on public.special_tasks for insert to authenticated
with check (assigned_by = auth.uid() and public.current_app_role() in ('admin','coordinator'));
create policy "tasks_update_owner_or_manager" on public.special_tasks for update to authenticated
using (owner_id = auth.uid() or assigned_by = auth.uid() or public.current_app_role() in ('admin','coordinator'))
with check (owner_id = auth.uid() or assigned_by = auth.uid() or public.current_app_role() in ('admin','coordinator'));
create policy "task_members_select_scoped" on public.task_members for select to authenticated
using (staff_id = auth.uid() or public.current_app_role() in ('admin','coordinator','appraisal_authority'));
create policy "task_members_admin_coord_write" on public.task_members for all to authenticated
using (public.current_app_role() in ('admin','coordinator'))
with check (public.current_app_role() in ('admin','coordinator'));
create policy "task_updates_select" on public.task_updates for select to authenticated
using (author_id = auth.uid() or public.is_admin_or_authority() or exists(select 1 from public.special_tasks t where t.id = task_id and (t.owner_id = auth.uid() or public.can_manage_staff(t.owner_id))));
create policy "task_updates_insert" on public.task_updates for insert to authenticated
with check (author_id = auth.uid() and exists(select 1 from public.special_tasks t where t.id = task_id and (t.owner_id = auth.uid() or t.assigned_by = auth.uid() or public.current_app_role() in ('admin','coordinator'))));

create policy "evidence_select_scoped" on public.evidence_files for select to authenticated
using (uploader_id = auth.uid() or public.is_admin_or_authority()
  or (task_id is not null and exists(select 1 from public.special_tasks t where t.id = task_id and (t.owner_id = auth.uid() or public.can_manage_staff(t.owner_id))))
  or (duty_record_id is not null and exists(select 1 from public.duty_records d where d.id = duty_record_id and (d.staff_id = auth.uid() or public.can_manage_staff(d.staff_id)))));
create policy "evidence_insert_own" on public.evidence_files for insert to authenticated
with check (uploader_id = auth.uid());
create policy "evidence_delete_own_or_admin" on public.evidence_files for delete to authenticated
using (uploader_id = auth.uid() or public.current_app_role() = 'admin');

create policy "point_rules_read" on public.special_point_rules for select to authenticated using (true);
create policy "point_rules_admin_write" on public.special_point_rules for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "points_select_scoped" on public.special_point_entries for select to authenticated
using (staff_id = auth.uid() or proposed_by = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(staff_id));
create policy "points_propose" on public.special_point_entries for insert to authenticated
with check (proposed_by = auth.uid() and public.current_app_role() in ('admin','coordinator'));
create policy "points_review" on public.special_point_entries for update to authenticated
using (public.current_app_role() in ('admin','appraisal_authority'))
with check (public.current_app_role() in ('admin','appraisal_authority'));

create policy "appraisals_select_scoped" on public.appraisals for select to authenticated
using (staff_id = auth.uid() or supervisor_id = auth.uid() or authority_id = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(staff_id));
create policy "appraisals_staff_create" on public.appraisals for insert to authenticated
with check (staff_id = auth.uid() and status = 'draft');
create policy "appraisals_staff_update_draft" on public.appraisals for update to authenticated
using ((staff_id = auth.uid() and status in ('draft','returned')) or supervisor_id = auth.uid() or public.current_app_role() in ('admin','appraisal_authority'))
with check (staff_id = auth.uid() or supervisor_id = auth.uid() or public.current_app_role() in ('admin','appraisal_authority'));

create policy "ratings_select_via_appraisal" on public.appraisal_ratings for select to authenticated
using (exists(select 1 from public.appraisals a where a.id = appraisal_id and (a.staff_id = auth.uid() or a.supervisor_id = auth.uid() or a.authority_id = auth.uid() or public.is_admin_or_authority() or public.can_manage_staff(a.staff_id))));
create policy "ratings_insert_reviewer" on public.appraisal_ratings for insert to authenticated
with check (rated_by = auth.uid() and (public.current_app_role() in ('coordinator','appraisal_authority','admin')));
create policy "ratings_update_reviewer" on public.appraisal_ratings for update to authenticated
using (public.current_app_role() in ('coordinator','appraisal_authority','admin'))
with check (public.current_app_role() in ('coordinator','appraisal_authority','admin'));

create policy "self_assessment_select_scoped" on public.self_assessments for select to authenticated
using (exists(select 1 from public.appraisals a where a.id = appraisal_id and (a.staff_id = auth.uid() or a.supervisor_id = auth.uid() or public.is_admin_or_authority())));
create policy "self_assessment_own_write" on public.self_assessments for all to authenticated
using (exists(select 1 from public.appraisals a where a.id = appraisal_id and a.staff_id = auth.uid() and a.status in ('draft','returned')))
with check (exists(select 1 from public.appraisals a where a.id = appraisal_id and a.staff_id = auth.uid() and a.status in ('draft','returned')));

create policy "review_meetings_select" on public.review_meetings for select to authenticated
using (exists(select 1 from public.appraisals a where a.id = appraisal_id and (a.staff_id = auth.uid() or a.supervisor_id = auth.uid() or public.is_admin_or_authority())));
create policy "review_meetings_write_reviewer" on public.review_meetings for all to authenticated
using (public.current_app_role() in ('admin','coordinator','appraisal_authority'))
with check (public.current_app_role() in ('admin','coordinator','appraisal_authority'));

create policy "development_select_scoped" on public.development_plans for select to authenticated
using (exists(select 1 from public.appraisals a where a.id = appraisal_id and (a.staff_id = auth.uid() or a.supervisor_id = auth.uid() or public.is_admin_or_authority())));
create policy "development_write_reviewer" on public.development_plans for all to authenticated
using (public.current_app_role() in ('admin','coordinator','appraisal_authority'))
with check (public.current_app_role() in ('admin','coordinator','appraisal_authority'));

create policy "appeals_select_scoped" on public.appeals for select to authenticated
using (submitted_by = auth.uid() or public.is_admin_or_authority() or reviewer_id = auth.uid());
create policy "appeals_submit_own" on public.appeals for insert to authenticated
with check (submitted_by = auth.uid() and exists(select 1 from public.appraisals a where a.id = appraisal_id and a.staff_id = auth.uid()));
create policy "appeals_review_authority" on public.appeals for update to authenticated
using (public.current_app_role() in ('admin','appraisal_authority'))
with check (public.current_app_role() in ('admin','appraisal_authority'));

create policy "audit_admin_authority_read" on public.audit_logs for select to authenticated
using (public.current_app_role() in ('admin','appraisal_authority'));

-- Storage: create a PRIVATE bucket named 'appraisal-evidence' in the Supabase
-- Storage dashboard. Add storage policies after testing your exact access rules.
-- Do not make this bucket public. Prefer short-lived signed URLs.
-- Do not expose the service_role key to the browser.

-- Validation query: expected total weight is 100.
do $$
declare total_weight numeric;
begin
  select sum(weight) into total_weight from public.appraisal_domains;
  if total_weight <> 100 then
    raise exception 'Domain weights must total 100; found %', total_weight;
  end if;
end $$;
