-- Add OAuth support and automatic plan assignment
-- Migration: 20260205_add_oauth_support.sql

-- Add OAuth tracking columns to profiles table
DO $$
BEGIN
    -- Add oauth_provider column to track authentication method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'oauth_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN oauth_provider TEXT;
        COMMENT ON COLUMN public.profiles.oauth_provider IS 'OAuth provider used for authentication (google, github, etc.) or NULL for email/password';
    END IF;

    -- Add email_domain column for quick domain-based queries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_domain') THEN
        ALTER TABLE public.profiles ADD COLUMN email_domain TEXT;
        COMMENT ON COLUMN public.profiles.email_domain IS 'Email domain extracted from user email for plan assignment';
    END IF;
END $$;

-- Create function to determine subscription plan based on email domain
CREATE OR REPLACE FUNCTION get_plan_from_email_domain(email TEXT)
RETURNS TEXT AS $$
DECLARE
    domain TEXT;
BEGIN
    -- Extract domain from email
    domain := LOWER(SPLIT_PART(email, '@', 2));
    
    -- Assign plan based on domain
    CASE 
        WHEN domain = 'gmail.com' THEN
            RETURN 'free';
        WHEN domain LIKE '%.edu.in' OR domain = 'edu.in' THEN
            RETURN 'educational';
        WHEN domain LIKE '%.edu' OR domain = 'edu' THEN
            RETURN 'educational';
        WHEN domain LIKE '%.ac.in' OR domain = 'ac.in' THEN
            RETURN 'educational';
        WHEN domain LIKE '%.ac.uk' OR domain = 'ac.uk' THEN
            RETURN 'educational';
        ELSE
            RETURN 'free';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to auto-assign plan on profile creation
CREATE OR REPLACE FUNCTION auto_assign_subscription_plan()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    email_domain TEXT;
    assigned_plan TEXT;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
    
    -- Extract domain
    email_domain := LOWER(SPLIT_PART(user_email, '@', 2));
    
    -- Get plan based on domain
    assigned_plan := get_plan_from_email_domain(user_email);
    
    -- Set values if not already set
    IF NEW.email_domain IS NULL THEN
        NEW.email_domain := email_domain;
    END IF;
    
    IF NEW.subscription_plan IS NULL THEN
        NEW.subscription_plan := assigned_plan;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign plan on profile insert
DROP TRIGGER IF EXISTS trigger_auto_assign_plan ON public.profiles;
CREATE TRIGGER trigger_auto_assign_plan
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_subscription_plan();

-- Update existing profiles to populate email_domain and assign plans if missing
DO $$
DECLARE
    profile_record RECORD;
    v_user_email TEXT;
    v_email_domain TEXT;
    v_assigned_plan TEXT;
BEGIN
    FOR profile_record IN SELECT id FROM public.profiles WHERE public.profiles.email_domain IS NULL OR public.profiles.subscription_plan IS NULL
    LOOP
        -- Get user email
        SELECT email INTO v_user_email FROM auth.users WHERE id = profile_record.id;
        
        IF v_user_email IS NOT NULL THEN
            -- Extract domain
            v_email_domain := LOWER(SPLIT_PART(v_user_email, '@', 2));
            
            -- Get plan
            v_assigned_plan := get_plan_from_email_domain(v_user_email);
            
            -- Update profile
            UPDATE public.profiles 
            SET 
                email_domain = COALESCE(public.profiles.email_domain, v_email_domain),
                subscription_plan = COALESCE(public.profiles.subscription_plan, v_assigned_plan)
            WHERE id = profile_record.id;
        END IF;
    END LOOP;
END $$;
