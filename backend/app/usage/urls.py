from django.urls import path
from .views import UsageStatsView
from .game_views import GameScoreView, GameRankView

urlpatterns = [
    path('stats/', UsageStatsView.as_view(), name='usage-stats'),
    path('game/score/', GameScoreView.as_view(), name='game-score'),
    path('game/rank/', GameRankView.as_view(), name='game-rank'),
]
