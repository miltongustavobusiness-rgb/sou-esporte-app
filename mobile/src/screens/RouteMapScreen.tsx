import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api, Event } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RouteMapScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RouteMap'>;
  route: RouteProp<RootStackParamList, 'RouteMap'>;
};

interface RoutePoint {
  latitude: number;
  longitude: number;
  type?: 'start' | 'end' | 'water' | 'km';
  label?: string;
}

export default function RouteMapScreen({ navigation, route }: RouteMapScreenProps) {
  const eventId = route.params?.eventId;
  const eventName = route.params?.eventName || 'Evento';
  const distance = route.params?.distance || '5km';
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: -23.5505, lng: -46.6333 }); // Default: São Paulo

  const loadEventRoute = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    
    try {
      const eventData = await api.getEvent(eventId);
      setEvent(eventData);
      
      // Parse route coordinates if available
      if (eventData.routeCoordinates && Array.isArray(eventData.routeCoordinates)) {
        const points: RoutePoint[] = eventData.routeCoordinates.map((coord: any, idx: number, arr: any[]) => ({
          latitude: coord.lat,
          longitude: coord.lng,
          type: idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : undefined,
          label: idx === 0 ? 'Largada' : idx === arr.length - 1 ? 'Chegada' : undefined,
        }));
        setRoutePoints(points);
      }
      
      // Set map center
      if (eventData.mapCenter) {
        setMapCenter(eventData.mapCenter);
      } else if (eventData.routeCoordinates && eventData.routeCoordinates.length > 0) {
        const coords = eventData.routeCoordinates;
        const avgLat = coords.reduce((sum: number, c: any) => sum + c.lat, 0) / coords.length;
        const avgLng = coords.reduce((sum: number, c: any) => sum + c.lng, 0) / coords.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error) {
      console.error('Error loading event route:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEventRoute();
  }, [loadEventRoute]);

  // Generate map HTML for WebView
  const generateMapHtml = () => {
    const routeCoords = routePoints.length > 0 
      ? routePoints.map(p => [p.latitude, p.longitude])
      : [[mapCenter.lat, mapCenter.lng]];
    
    const startPoint = routePoints.find(p => p.type === 'start');
    const endPoint = routePoints.find(p => p.type === 'end');
    const waterPoints = routePoints.filter(p => p.type === 'water');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${mapCenter.lat}, ${mapCenter.lng}], 14);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
          }).addTo(map);
          
          ${routePoints.length > 1 ? `
          const routeCoords = ${JSON.stringify(routeCoords)};
          
          const polyline = L.polyline(routeCoords, {
            color: '#84CC16',
            weight: 4,
            opacity: 0.9
          }).addTo(map);
          
          map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
          ` : ''}
          
          ${startPoint ? `
          L.circleMarker([${startPoint.latitude}, ${startPoint.longitude}], {
            radius: 10,
            fillColor: '#84CC16',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          }).addTo(map).bindPopup('Largada');
          ` : ''}
          
          ${endPoint ? `
          L.circleMarker([${endPoint.latitude}, ${endPoint.longitude}], {
            radius: 10,
            fillColor: '#EF4444',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          }).addTo(map).bindPopup('Chegada');
          ` : ''}
          
          ${waterPoints.map(wp => `
          L.circleMarker([${wp.latitude}, ${wp.longitude}], {
            radius: 8,
            fillColor: '#3B82F6',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          }).addTo(map).bindPopup('Hidratação');
          `).join('')}
        </script>
      </body>
      </html>
    `;
  };

  const renderElevationChart = () => {
    // Generate elevation data based on route length
    const numPoints = Math.max(5, Math.ceil(parseFloat(distance) || 5));
    const elevationData = Array.from({ length: numPoints }, (_, i) => ({
      km: i,
      elevation: Math.floor(Math.random() * 20) + 5, // Random elevation for demo
    }));
    
    const maxElevation = Math.max(...elevationData.map(d => d.elevation));
    
    return (
      <View style={styles.elevationChart}>
        <View style={styles.elevationBars}>
          {elevationData.map((data, index) => (
            <View key={index} style={styles.elevationBarContainer}>
              <View 
                style={[
                  styles.elevationBar, 
                  { height: (data.elevation / maxElevation) * 60 }
                ]} 
              />
              <Text style={styles.elevationLabel}>{data.km}km</Text>
            </View>
          ))}
        </View>
        <View style={styles.elevationLegend}>
          <Text style={styles.elevationLegendText}>Elevação (m)</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando percurso...</Text>
      </View>
    );
  }

  const waterStationCount = routePoints.filter(p => p.type === 'water').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Map */}
      <View style={styles.mapContainer}>
        <iframe
          srcDoc={generateMapHtml()}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Percurso {distance}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{eventName}</Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        
        {/* Route Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{distance}</Text>
            <Text style={styles.statLabel}>Distância</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={20} color={COLORS.warning} />
            <Text style={styles.statValue}>{event?.elevation || '--'}m</Text>
            <Text style={styles.statLabel}>Elevação</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="water" size={20} color="#3B82F6" />
            <Text style={styles.statValue}>{waterStationCount}</Text>
            <Text style={styles.statLabel}>Hidratação</Text>
          </View>
        </View>

        {/* Elevation Chart */}
        <Text style={styles.sectionTitle}>Perfil de Elevação</Text>
        {renderElevationChart()}

        {/* Legend */}
        <Text style={styles.sectionTitle}>Legenda</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Largada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.legendText}>Chegada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Hidratação</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Marcação km</Text>
          </View>
        </View>

        {/* Event Info */}
        {event && (
          <View style={styles.eventInfoContainer}>
            <Text style={styles.eventInfoLabel}>Local de Largada</Text>
            <Text style={styles.eventInfoValue}>{event.startLocation || event.address || `${event.city}, ${event.state}`}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.medium,
  },
  headerTitle: {
    fontSize: SIZES.body2,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    ...SHADOWS.large,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  sectionTitle: {
    fontSize: SIZES.body2,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  elevationChart: {
    marginBottom: SPACING.lg,
  },
  elevationBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    padding: SPACING.sm,
  },
  elevationBarContainer: {
    alignItems: 'center',
  },
  elevationBar: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  elevationLabel: {
    fontSize: SIZES.body6 || 10,
    color: COLORS.textMuted,
  },
  elevationLegend: {
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  elevationLegendText: {
    fontSize: SIZES.body6 || 10,
    color: COLORS.textMuted,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
  },
  eventInfoContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  eventInfoLabel: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  eventInfoValue: {
    fontSize: SIZES.body3,
    fontWeight: '600',
    color: COLORS.text,
  },
});
