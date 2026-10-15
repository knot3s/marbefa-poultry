from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ml.anomaly import run_anomaly_detection, run_anomaly_detection_for_batch
from .ml.forecasting import forecast_batch
from .ml.kpis import get_batch_kpis
from .models import AnomalyAlert, DailyLog, FlockBatch, User
from .serializers import (
    AnomalyAlertSerializer,
    DailyLogListSerializer,
    DailyLogSerializer,
    FlockBatchSerializer,
    UserCreateSerializer,
    UserSerializer,
)


# ---------- Auth ----------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ---------- Flock Batch ----------

class FlockBatchViewSet(viewsets.ModelViewSet):
    serializer_class = FlockBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FlockBatch.objects.all().order_by('-arrival_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_permissions(self):
        # Staff can list/retrieve; only Manager can create/update/delete
        from rest_framework.permissions import BasePermission

        class IsManagerOrReadOnly(BasePermission):
            def has_permission(self, request, view):
                if request.method in ('GET', 'HEAD', 'OPTIONS'):
                    return True
                return request.user.is_authenticated and request.user.role == 'Manager'

        return [IsManagerOrReadOnly()]


# ---------- Daily Log ----------

class DailyLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return DailyLogListSerializer
        return DailyLogSerializer

    def get_queryset(self):
        qs = DailyLog.objects.select_related('batch').all()
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.order_by('-record_date')

    def perform_create(self, serializer):
        log = serializer.save()
        # Run anomaly detection after saving
        run_anomaly_detection(log.batch, log)

    @action(detail=False, methods=['get'])
    def by_batch(self, request):
        """Return daily logs for a specific batch with computed fields."""
        batch_id = request.query_params.get('batch')
        if not batch_id:
            return Response({'error': 'batch param required'}, status=400)
        logs = DailyLog.objects.filter(batch_id=batch_id).order_by('record_date')
        data = DailyLogSerializer(logs, many=True).data
        return Response(data)


# ---------- Anomaly Alerts ----------

class AnomalyAlertViewSet(viewsets.ModelViewSet):
    serializer_class = AnomalyAlertSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = AnomalyAlert.objects.select_related('batch').all()
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        unack = self.request.query_params.get('unacknowledged')
        if unack:
            qs = qs.filter(acknowledged_status=False)
        return qs.order_by('-trigger_date')

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.acknowledged_status = True
        alert.save()
        return Response(AnomalyAlertSerializer(alert).data)


# ---------- KPI Dashboard ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def batch_kpis(request, batch_id):
    """Return real-time KPI metrics for a specific batch."""
    try:
        batch = FlockBatch.objects.get(batch_id=batch_id)
    except FlockBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)
    return Response(get_batch_kpis(batch))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_kpis(request):
    """Return KPI snapshots for all batches."""
    batches = FlockBatch.objects.all().order_by('-arrival_date')
    return Response([get_batch_kpis(b) for b in batches])


# ---------- ML Forecasting ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forecast(request, batch_id):
    """Return a 7-day egg production forecast for a batch."""
    try:
        batch = FlockBatch.objects.get(batch_id=batch_id)
    except FlockBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)
    horizon = int(request.query_params.get('horizon', 7))
    return Response(forecast_batch(batch, horizon))


# ---------- Anomaly Detection Trigger ----------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_anomaly(request):
    """Manually trigger anomaly detection for a batch (or all)."""
    batch_id = request.data.get('batch_id')
    if batch_id:
        try:
            batch = FlockBatch.objects.get(batch_id=batch_id)
        except FlockBatch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)
        alerts = run_anomaly_detection_for_batch(batch)
    else:
        from .ml.anomaly import run_anomaly_detection_all
        alerts = run_anomaly_detection_all()
    return Response({
        'alerts_created': len(alerts),
        'alerts': AnomalyAlertSerializer(alerts, many=True).data,
    })
