-- The admin summary is accessed through the server's service-role client only.
-- The production baseline accidentally granted execution to public clients.
revoke execute on function public.admin_dashboard_summary(timestamptz, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary(timestamptz, integer, integer)
  to service_role;
