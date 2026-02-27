from django.db import models
import uuid
from accounts.models import Plan

class Usage(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.UUIDField(unique=True) # Matches Supabase Auth ID
    courses_created = models.IntegerField(default=0)
    modules_created = models.IntegerField(default=0)
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True)
    high_score = models.IntegerField(default=0)
    games_played = models.IntegerField(default=0)
    last_reset_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usage'
