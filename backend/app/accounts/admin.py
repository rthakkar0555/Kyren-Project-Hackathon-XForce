from django.contrib import admin
from .models import Plan, Payment

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('plan_name', 'price', 'max_courses', 'duration_days')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'amount', 'status', 'created_at')
    list_filter = ('status', 'provider')
