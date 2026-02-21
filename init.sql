-- Create health_data table
CREATE TABLE IF NOT EXISTS public.health_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    heart_rate INTEGER NOT NULL,
    temperature DECIMAL(4, 1) NOT NULL,
    spo2 INTEGER NOT NULL,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure that Data API is enabled in your Supabase project
-- and appropriate row level security (RLS) policies are configured
-- if accessed directly from the frontend, but here the backend accesses it.
