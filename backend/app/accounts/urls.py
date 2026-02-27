from django.urls import path
from .views import CreateCheckoutSessionView, PaymentSuccessView

urlpatterns = [
    path('checkout/', CreateCheckoutSessionView.as_view(), name='checkout'),
    path('payment-success/', PaymentSuccessView.as_view(), name='payment-success'),
]
