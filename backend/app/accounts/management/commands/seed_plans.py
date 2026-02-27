from django.core.management.base import BaseCommand
from accounts.models import Plan

class Command(BaseCommand):
    help = 'Seeds initial SaaS plans'

    def handle(self, *args, **kwargs):
        plans = [
            {
                'plan_id': 'free',
                'plan_name': 'Normal User',
                'max_courses': 1,
                'max_modules_per_course': 8,
                'price': 0.00,
                'regeneration_limit': 5,
                'certificate_access': False,
                'duration_days': 36500 # Lifetime-ish
            },
            {
                'plan_id': 'edu',
                'plan_name': 'Educational User',
                'max_courses': 12,
                'max_modules_per_course': 4,
                'price': 0.00,
                'regeneration_limit': 20,
                'certificate_access': True,
                'duration_days': 365
            },
            {
                'plan_id': 'pro',
                'plan_name': 'Pro User',
                'max_courses': 9999,
                'max_modules_per_course': 8,
                'price': 29.99,
                'regeneration_limit': 9999,
                'certificate_access': True,
                'duration_days': 30
            },
        ]

        for p in plans:
            Plan.objects.update_or_create(
                plan_id=p['plan_id'],
                defaults=p
            )
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded plans'))
