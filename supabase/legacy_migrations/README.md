# Legacy Supabase migrations

Archived on 2026-08-13.

These files are historical records from the period when production schema changes were applied manually. The production project had no `supabase_migrations.schema_migrations` remote history, so these non-unique eight-digit versions cannot safely remain in the Supabase CLI active migration path.

The schema objects intended by these files were checked against the production `public` catalog before archiving. The active baseline was generated directly from that production schema; these files are not replayed by `supabase db push`.

`20260628_ai_grading_pro.txt` was documentation/manual SQL and was never a valid Supabase CLI `.sql` migration.

From this baseline onward, every active migration must use a unique 14-digit UTC version (`YYYYMMDDHHMMSS_description.sql`). Do not move these files back into `supabase/migrations` or edit them as current schema sources.

| Historical file | SHA-256 |
| --- | --- |
| `20260628_ai_grading_pro.txt` | `9e1750a12c49fa71704a6dc5883782397289eda080f122a737989e3d4a43ad46` |
| `20260628_ai_grading_records.sql` | `7ae33d4093d12d8e41470b89957c35b79ad79ea405bd153cae9a18928b61ce27` |
| `20260628_google_auth.sql` | `0411076855d2476dfce2038875d1f627d8a179696dcb85d03c9dc5e057fe9408` |
| `20260701_reference_book.sql` | `a8f6dc4874ab44fb829c16eec9b15717a4691fab484f34df15c598c6ab7a8dc5` |
| `20260701_security_hardening.sql` | `87e008997910950674d460b1e87ba1577b80a38d22490046b6fd4234ea16ea04` |
| `20260704_check_pack_v1.sql` | `1f46b0675d68c4a97bc8ade5052e3f2662f96195ffaf7ee24679d3e8f7549c83` |
| `20260704_plan_start_date.sql` | `80b28b448fa435bf92bd645184f1484fa3f1dae43a0a44371b5e692cae71c2be` |
| `20260704_study_progress_v1.sql` | `b9ab1fe578effeb907116fcff29ec62cd8b7fd1a649675b0e9412000d5ea0181` |
| `20260704_weekly_plan.sql` | `21f0250e236fc0bd3e2bc2f40361499526dddbbc320ab6c317543b21d4812872` |
| `20260705_integrated_learning_status_v1.sql` | `0d2d42d5ba91c44b08b9f8feca678fab19461601ca2ee4a6df84123e3a5a2846` |
| `20260705_plan_adjustment_v1.sql` | `8bbad7d5168bfc39f92f9e69fd16fda8c98758ea6a7760a031dd6079b039c540` |
| `20260706_checkpoint_progress.sql` | `52d59c4e6e958eb8142f26df96c63b0999f52ff0aa81b052edd8c0afac2f150f` |
| `20260710_admin_dashboard_summary.sql` | `8983d9b1af95a4312feb414e22605ca87a13fd1bbdcc84859025ab06277174c5` |
| `20260710_billing_webhook_retries.sql` | `149299f5325eca83b7fa387534af907fc783a276769beb8f97135ce0dcbde2fc` |
| `20260712_billing_v2.sql` | `69f92efdb5daab4bb1849e1c9983eb9d05e7dea78bdf90acada09a48c73cf9e0` |
| `20260719_billing_correctness.sql` | `d2e7f17907d25e9515a583a283be825f5d9a29769c3c87081bbf7eda6f4facd8` |
| `20260726_official_past_exam_attempts.sql` | `53a7adc4b3ae3a51caee5db4dbc1d629eb0c1b0bc0d918b6b13e0537867bda99` |
| `20260801_question_quality_metrics.sql` | `4f45311befbf039e27fea149341c8341cae05a6e0b70d7f8f5f92888abb01c78` |
