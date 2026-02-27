from django.db import models
from django.utils import timezone

class Plan(models.Model):
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('edu', 'Educational'),
        ('pro', 'Pro'),
    ]

    plan_id = models.CharField(max_length=20, primary_key=True, choices=PLAN_CHOICES)
    plan_name = models.CharField(max_length=50)
    max_courses = models.IntegerField()
    max_modules_per_course = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    regeneration_limit = models.IntegerField(default=0)
    certificate_access = models.BooleanField(default=False)
    duration_days = models.IntegerField(default=365) # Default 1 year

    def __str__(self):
        return self.plan_name

class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    user_id = models.UUIDField() # Matches Supabase ID
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    provider = models.CharField(max_length=20) # stripe, razorpay
    status = models.CharField(max_length=20) # succeeded, pending, failed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_id} - {self.amount}"
