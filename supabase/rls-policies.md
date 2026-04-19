Enable RLS on public.signals and public.profiles.

Example policies:

-- signals: allow authenticated inserts and selects
CREATE POLICY "insert_signals_authenticated" ON public.signals
  FOR INSERT USING (auth.role() = 'authenticated');

CREATE POLICY "select_signals_authenticated" ON public.signals
  FOR SELECT USING (auth.role() = 'authenticated');

-- profiles: allow users to insert/update their own profile
CREATE POLICY "insert_profile_authenticated" ON public.profiles
  FOR INSERT USING (auth.role() = 'authenticated');

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
