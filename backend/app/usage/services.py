from usage.models import Usage
from accounts.models import Plan
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

class UsageService:
    @staticmethod
    def get_or_create_usage(user_id):
        usage, created = Usage.objects.get_or_create(user_id=user_id)
        
        # Auto-Upgrade Logic: Check if user is eligible for Edu plan (if currently free/unset)
        # We check this every time usage is accessed
        if not usage.plan_id or usage.plan_id == 'free':
            from django.contrib.auth.models import User
            try:
                 user_obj = User.objects.get(username=user_id)
                 if user_obj.email and user_obj.email.lower().endswith('.edu.in'):
                     if usage.plan_id != 'edu': # Only save if changing
                         usage.plan_id = 'edu'
                         usage.save()
                 else:
                     if not usage.plan_id: # Only default if unset
                        usage.plan_id = 'free'
                        usage.save()
            except User.DoesNotExist:
                 if not usage.plan_id:
                    usage.plan_id = 'free'
                    usage.save()
        
        return usage

    @staticmethod
    def check_limit(user_id, metric, count=1):
        """
        metric: 'courses_created' or 'modules_created'
        """
        usage = UsageService.get_or_create_usage(user_id)

        user_plan_id = usage.plan_id or 'free'
        
        try:
            plan = Plan.objects.get(plan_id=user_plan_id)
        except Plan.DoesNotExist:
            plan = Plan.objects.get(plan_id='free')
        
        if metric == 'courses_created':
            limit = plan.max_courses
            current = usage.courses_created
        elif metric == 'modules_created':
            limit = plan.max_modules_per_course # This is per course, need to be careful. usage.modules_created is TOTAL?
            # If usage.modules_created is total, we need a total limit? 
            # The prompt says: "Each course can have maximum X modules". 
            # So this check should be "Per Course". 
            # But here we are checking global limits?
            # "Unlimited regeneration" -> This might be a separate counter.
            
            # Let's assume this checks if they can generate *another* module for a course.
            # Actually, max_modules_per_course is a PROPERTY of the course generation, not a global usage limit.
            # Converting to Global Limit check if it was 'courses_created'
            return True # Logic handled in specific service
            
        if current + count > limit:
            return False
        
        return True

    @staticmethod
    def increment_metric(user_id, metric, count=1):
        with transaction.atomic():
            usage = UsageService.get_or_create_usage(user_id)
            if metric == 'courses_created':
                usage.courses_created += count
            elif metric == 'modules_created':
                usage.modules_created += count
            usage.save()
