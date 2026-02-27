from django.contrib import admin
from .models import Usage

@admin.register(Usage)
class UsageAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'plan', 'courses_created', 'modules_created', 'last_reset_date')
    search_fields = ('user_id',)
