from django.urls import path
from .views import CheckLimitView, TrackUsageView

urlpatterns = [
    path('check-limit/', CheckLimitView.as_view(), name='check-limit'),
    path('track-usage/', TrackUsageView.as_view(), name='track-usage'),
]
