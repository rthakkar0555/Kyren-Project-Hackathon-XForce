from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from supabase import create_client, Client
from django.contrib.auth.models import User
from accounts.models import Plan
import os

class SupabaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        try:
            token = auth_header.split(' ')[1]
            supabase: Client = create_client(
                os.environ.get('NEXT_PUBLIC_SUPABASE_URL'),
                os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
            )
            
            # Verify token using Supabase Auth
            user_response = supabase.auth.get_user(token)
            
            if not user_response.user:
                raise AuthenticationFailed('Invalid token')

            user_data = user_response.user
            
            # Get or create local user to map to Supabase ID
            # Note: We use the UUID from Supabase as the username or a specific field
            # Get or create local user to map to Supabase ID
            user, created = User.objects.get_or_create(username=user_data.id)
            
            # Always update email and name to keep in sync
            if user.email != user_data.email:
                user.email = user_data.email
                user.save()
                
            first_name = user_data.user_metadata.get('full_name', '')
            if first_name and user.first_name != first_name:
                user.first_name = first_name
                user.save()

            return (user, None)

        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
