from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.authentication import SupabaseAuthentication
from usage.services import UsageService
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CheckLimitView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.username # Mapped from Supabase ID
        
        if not UsageService.check_limit(user_id, 'courses_created'):
            return Response(
                {"error": "Plan limit reached. Please upgrade to create more courses."},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({"message": "Allowed"}, status=status.HTTP_200_OK)

class TrackUsageView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.username
        # Potentially validate that they actually created something (or trust internal API)
        UsageService.increment_metric(user_id, 'courses_created')
        return Response({"message": "Usage tracked"}, status=status.HTTP_200_OK)
