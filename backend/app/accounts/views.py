from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.authentication import SupabaseAuthentication
from .models import Payment, Plan
from usage.models import Usage
import uuid

class CreateCheckoutSessionView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.username
        plan_id = request.data.get('plan_id')
        
        if not plan_id:
            return Response({'error': 'Plan ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = Plan.objects.get(plan_id=plan_id)
        except Plan.DoesNotExist:
             return Response({'error': 'Invalid Plan'}, status=status.HTTP_400_BAD_REQUEST)

        # Mock Stripe Session
        # In real world: session = stripe.checkout.Session.create(...)
        # Here we just return a success URL immediately
        
        return Response({
            'url': f'http://localhost:3000/payment/success?plan_id={plan_id}&session_id=mock_{uuid.uuid4()}'
        })

class PaymentSuccessView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.user.username
        plan_id = request.data.get('plan_id')
        session_id = request.data.get('session_id')

        # Verify 'payment'
        # In real world: verify session_id with Stripe
        
        try:
            plan = Plan.objects.get(plan_id=plan_id)
        except Plan.DoesNotExist:
             return Response({'error': 'Invalid Plan'}, status=status.HTTP_400_BAD_REQUEST)

        # Record Payment
        Payment.objects.create(
            user_id=user_id,
            amount=plan.price,
            provider='mock_stripe',
            status='succeeded'
        )

        # Update User Plan
        usage, created = Usage.objects.get_or_create(user_id=user_id)
        usage.plan = plan
        usage.save()

        return Response({'status': 'success', 'new_plan': plan.plan_name})
