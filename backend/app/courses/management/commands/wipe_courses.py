from django.core.management.base import BaseCommand
from django.db import connection, transaction
from usage.models import Usage

class Command(BaseCommand):
    help = 'Deletes ALL courses and resets usage counts'

    def handle(self, *args, **kwargs):
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Delete all courses
                # Assuming table name is 'courses' (lowercase) based on Supabase conventions
                self.stdout.write('Deleting all courses...')
                cursor.execute("DELETE FROM courses;")
                count = cursor.rowcount
                self.stdout.write(f'Deleted {count} courses.')

            # 2. Reset Usage
            self.stdout.write('Resetting usage stats...')
            Usage.objects.all().update(courses_created=0, modules_created=0)
            self.stdout.write('Usage stats reset.')

        self.stdout.write(self.style.SUCCESS('Successfully wiped all courses and reset limits.'))
