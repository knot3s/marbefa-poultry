from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AnomalyAlert, DailyLog, FlockBatch

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data.get('role', 'Staff'),
        )
        return user


class FlockBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlockBatch
        fields = ['batch_id', 'user', 'breed_type', 'arrival_date', 'initial_population']
        read_only_fields = ['batch_id', 'user']


class DailyLogSerializer(serializers.ModelSerializer):
    total_eggs = serializers.IntegerField(read_only=True)

    class Meta:
        model = DailyLog
        fields = [
            'log_id', 'batch', 'record_date', 'feed_consumed_kg',
            'water_consumed_l', 'mortality_count',
            'eggs_small', 'eggs_medium', 'eggs_large', 'eggs_xl', 'eggs_reject',
            'total_eggs',
        ]
        read_only_fields = ['log_id']


class DailyLogListSerializer(serializers.ModelSerializer):
    total_eggs = serializers.IntegerField(read_only=True)

    class Meta:
        model = DailyLog
        fields = [
            'log_id', 'batch', 'record_date', 'feed_consumed_kg',
            'mortality_count', 'total_eggs',
        ]


class AnomalyAlertSerializer(serializers.ModelSerializer):
    batch_breed = serializers.CharField(source='batch.breed_type', read_only=True)

    class Meta:
        model = AnomalyAlert
        fields = [
            'alert_id', 'batch', 'batch_breed', 'trigger_date',
            'anomaly_type', 'severity_level', 'acknowledged_status', 'description',
        ]
        read_only_fields = ['alert_id', 'trigger_date']
