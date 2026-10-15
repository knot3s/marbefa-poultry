from django.db.models import Sum, Avg, Count
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


# ---------- User Management (Manager only) ----------

class IsManager(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'Manager'


class UserViewSet(viewsets.ModelViewSet):
    """CRUD for users. Managers only."""
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsManager]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'error': 'You cannot delete your own account.'}, status=400)
        return super().destroy(request, *args, **kwargs)


# ---------- Reports ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_summary(request, batch_id):
    """Return production summary stats for a batch over a date range."""
    try:
        batch = FlockBatch.objects.get(batch_id=batch_id)
    except FlockBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    qs = DailyLog.objects.filter(batch=batch)
    if start_date:
        qs = qs.filter(record_date__gte=start_date)
    if end_date:
        qs = qs.filter(record_date__lte=end_date)
    qs = qs.order_by('record_date')

    if not qs.exists():
        return Response({'batch_id': batch_id, 'days': 0, 'message': 'No data for selected period.'})

    agg = qs.aggregate(
        total_feed=Sum('feed_consumed_kg'),
        total_water=Sum('water_consumed_l'),
        total_mortality=Sum('mortality_count'),
        total_eggs_small=Sum('eggs_small'),
        total_eggs_medium=Sum('eggs_medium'),
        total_eggs_large=Sum('eggs_large'),
        total_eggs_xl=Sum('eggs_xl'),
        total_eggs_reject=Sum('eggs_reject'),
        avg_daily_eggs=Avg('eggs_small') + Avg('eggs_medium') + Avg('eggs_large') + Avg('eggs_xl'),
    )

    total_eggs = sum(
        agg[f] or 0 for f in
        ['total_eggs_small', 'total_eggs_medium', 'total_eggs_large', 'total_eggs_xl']
    )
    total_eggs_with_reject = total_eggs + (agg['total_eggs_reject'] or 0)
    total_feed = agg['total_feed'] or 0
    egg_mass_kg = (
        (agg['total_eggs_small'] or 0) * 0.045 +
        (agg['total_eggs_medium'] or 0) * 0.053 +
        (agg['total_eggs_large'] or 0) * 0.060 +
        (agg['total_eggs_xl'] or 0) * 0.066
    )
    fcr = round(total_feed / egg_mass_kg, 3) if egg_mass_kg > 0 else 0

    return Response({
        'batch_id': batch.batch_id,
        'breed_type': batch.breed_type,
        'start_date': str(qs.first().record_date),
        'end_date': str(qs.last().record_date),
        'days': qs.count(),
        'total_feed_kg': round(total_feed, 2),
        'total_water_l': round(agg['total_water'] or 0, 2),
        'total_mortality': agg['total_mortality'] or 0,
        'total_eggs': total_eggs,
        'total_eggs_reject': agg['total_eggs_reject'] or 0,
        'total_eggs_with_reject': total_eggs_with_reject,
        'avg_daily_eggs': round(total_eggs / qs.count(), 1),
        'fcr': fcr,
        'egg_mass_kg': round(egg_mass_kg, 2),
        'breakdown': {
            'small': agg['total_eggs_small'] or 0,
            'medium': agg['total_eggs_medium'] or 0,
            'large': agg['total_eggs_large'] or 0,
            'xl': agg['total_eggs_xl'] or 0,
        },
        'live_birds': batch.initial_population - (agg['total_mortality'] or 0),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_csv(request, batch_id):
    """Return daily logs for a batch as a downloadable CSV file."""
    import csv
    from django.http import HttpResponse

    try:
        batch = FlockBatch.objects.get(batch_id=batch_id)
    except FlockBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    qs = DailyLog.objects.filter(batch=batch)
    if start_date:
        qs = qs.filter(record_date__gte=start_date)
    if end_date:
        qs = qs.filter(record_date__lte=end_date)
    qs = qs.order_by('record_date')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="batch_{batch_id}_daily_logs.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Date', 'Feed (kg)', 'Water (L)', 'Mortality',
        'Eggs Small', 'Eggs Medium', 'Eggs Large', 'Eggs XL', 'Eggs Reject',
        'Total Eggs',
    ])
    for log in qs:
        writer.writerow([
            log.record_date,
            log.feed_consumed_kg,
            log.water_consumed_l,
            log.mortality_count,
            log.eggs_small,
            log.eggs_medium,
            log.eggs_large,
            log.eggs_xl,
            log.eggs_reject,
            log.total_eggs,
        ])
    return response
