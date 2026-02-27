from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.authentication import SupabaseAuthentication
from usage.services import UsageService
from accounts.models import Plan

class UsageStatsView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.username
        usage = UsageService.get_or_create_usage(user_id)
        
        # Plan is now auto-assigned in get_or_create_usage
        user_plan_id = usage.plan_id or 'free'

        try:
            plan = Plan.objects.get(plan_id=user_plan_id)
        except Plan.DoesNotExist:
             plan = Plan.objects.get(plan_id='free')

        return Response({
            "plan_name": plan.plan_name,
            "courses_created": usage.courses_created,
            "max_courses": plan.max_courses,
            "modules_created": usage.modules_created,
            "max_modules_per_course": plan.max_modules_per_course,
            "remaining_courses": plan.max_courses - usage.courses_created
        })
