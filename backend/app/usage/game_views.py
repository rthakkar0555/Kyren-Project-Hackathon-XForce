from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.authentication import SupabaseAuthentication
from usage.models import Usage
from usage.services import UsageService

class GameScoreView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.username
        score = request.data.get('score', 0)
        
        usage = UsageService.get_or_create_usage(user_id)
        
        usage.games_played += 1
        
        is_new_high = False
        if score > usage.high_score:
            usage.high_score = score
            is_new_high = True
            
        usage.save()
        
        return Response({
            "high_score": usage.high_score,
            "is_new_high": is_new_high,
            "games_played": usage.games_played
        })

class GameRankView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.username
        usage = UsageService.get_or_create_usage(user_id)
        
        # Calculate rank: count users with higher score + 1
        rank = Usage.objects.filter(high_score__gt=usage.high_score).count() + 1
        
        return Response({
            "high_score": usage.high_score,
            "rank": rank
        })
