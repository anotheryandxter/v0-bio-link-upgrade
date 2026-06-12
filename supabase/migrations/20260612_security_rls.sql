-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Allow public read access (SELECT) for all tables
CREATE POLICY "Allow public read access to profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow public read access to links" 
ON public.links FOR SELECT USING (true);

CREATE POLICY "Allow public read access to link_clicks" 
ON public.link_clicks FOR SELECT USING (true);

-- Allow authenticated users to insert/update profiles and links
-- Admin users are authenticated via Supabase Auth
CREATE POLICY "Allow authenticated insert to profiles" 
ON public.profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to profiles" 
ON public.profiles FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to links" 
ON public.links FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to links" 
ON public.links FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete to links" 
ON public.links FOR DELETE USING (auth.role() = 'authenticated');

-- Note: link_clicks insertions are primarily handled by server-side RPCs using the service_role key,
-- which bypasses RLS. Client-side inserts will be blocked by these rules unless authenticated.
