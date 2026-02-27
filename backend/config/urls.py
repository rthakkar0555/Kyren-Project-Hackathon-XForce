from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/courses/', include('courses.urls')),
    path('api/usage/', include('usage.urls')),
    path('api/accounts/', include('accounts.urls')),
]
