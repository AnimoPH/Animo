-- Organic is a way of growing, not a seed type, so it is not a rice type
-- category. Any crop logged as Organic moves to Inbred, which has the same 120
-- days, so no advisory changes. Hosted had no Organic rows when this was written.

update public.cropcycle set rice_type_category = 'Inbred' where rice_type_category = 'Organic';

alter table public.cropcycle drop constraint cropcycle_rice_type_category_check;
alter table public.cropcycle add constraint cropcycle_rice_type_category_check
  check (rice_type_category in ('Hybrid', 'Inbred', 'Specialty'));

create or replace function public.rice_maturity_days(category text)
returns int
language sql
immutable
as $$
  select case category
    when 'Hybrid' then 110
    when 'Inbred' then 120
    when 'Specialty' then 122
    else null
  end;
$$;
