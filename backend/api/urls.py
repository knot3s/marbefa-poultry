from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from . import views

router = DefaultRouter()
router.register(r'batches', views.FlockBatchViewSet, basename='batch')
router.register(r'daily-logs', views.DailyLogViewSet, basename='dailylog')
router.register(r'alerts', views.AnomalyAlertViewSet, basename='alert')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # KPI Dashboard
    path('kpis/', views.all_kpis, name='all-kpis'),
    path('kpis/<int:batch_id>/', views.batch_kpis, name='batch-kpis'),

    # ML Forecasting
    path('forecast/<int:batch_id>/', views.forecast, name='forecast'),

    # Anomaly detection trigger
    path('anomaly/run/', views.run_anomaly, name='run-anomaly'),

    # Reports
    path('reports/<int:batch_id>/summary/', views.report_summary, name='report-summary'),
    path('reports/<int:batch_id>/csv/', views.report_csv, name='report-csv'),

    # Router
    path('', include(router.urls)),
]
