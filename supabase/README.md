# Supabase setup notes

1. Create the project.
2. Run `schema.sql` in the SQL Editor.
3. Enable email/password Auth.
4. Create users via Auth; the trigger creates a `teacher` profile.
5. Promote an authorised initial Admin from the trusted SQL Editor only.
6. Create a **private** Storage bucket called `appraisal-evidence`.
7. Add and test Storage policies before uploading any files.
8. Test direct API access as Admin, Coordinator, Teacher and Appraisal Authority.

The provided policies are a baseline and require a complete review. Some production controls (immutable audit logging, secure final score computation, workflow state machine, storage object policies, notification delivery, exports) remain to be implemented.
