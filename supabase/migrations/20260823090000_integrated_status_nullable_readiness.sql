begin;

-- Task 10 compatibility cutover: historical values were produced by the retired
-- integrated-status formula. They cannot be reinterpreted as Exam Readiness.
alter table public.integrated_learning_status
  alter column readiness_score drop not null;

update public.integrated_learning_status
set readiness_score = null
where readiness_score is not null;

commit;
