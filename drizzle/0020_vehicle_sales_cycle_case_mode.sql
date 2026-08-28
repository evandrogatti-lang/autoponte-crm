-- Allow a new interested customer's sale cycle to reference an existing canonical stock vehicle.
alter table public.commercial_cases drop constraint if exists commercial_cases_acquisition_mode_check;
alter table public.commercial_cases add constraint commercial_cases_acquisition_mode_check
  check (acquisition_mode in ('direct_purchase','trade_in','consignment','appraisal_only','sale'));

