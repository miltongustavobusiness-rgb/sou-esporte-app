import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';

interface CountdownClockProps {
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Size of the clock in pixels */
  size?: number;
  /** Whether the event has started (stops animation) */
  eventStarted?: boolean;
  /** Primary color for the clock */
  primaryColor?: string;
  /** Secondary color for clock details */
  secondaryColor?: string;
}

/**
 * Animated analog clock that shows countdown time
 * Uses SVG for crisp rendering at any size
 */
export function CountdownClock({
  remainingMs,
  size = 80,
  eventStarted = false,
  primaryColor = '#84CC16', // lime-500
  secondaryColor = '#1E293B', // slate-800
}: CountdownClockProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate time components from remaining milliseconds
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;

  // Calculate angles for clock hands (0 degrees = 12 o'clock)
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourAngle = (hours / 12) * 360 + (minutes / 60) * 30;

  // Center and radius calculations
  const center = size / 2;
  const radius = (size / 2) - 4;
  const hourHandLength = radius * 0.5;
  const minuteHandLength = radius * 0.7;
  const secondHandLength = radius * 0.85;

  // Pulse animation for seconds hand
  useEffect(() => {
    if (eventStarted) {
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [eventStarted, pulseAnim]);

  // Calculate hand end points
  const getHandEndPoint = (angle: number, length: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + length * Math.cos(radians),
      y: center + length * Math.sin(radians),
    };
  };

  const hourEnd = getHandEndPoint(hourAngle, hourHandLength);
  const minuteEnd = getHandEndPoint(minuteAngle, minuteHandLength);
  const secondEnd = getHandEndPoint(secondAngle, secondHandLength);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Clock face background */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill={secondaryColor}
            stroke={primaryColor}
            strokeWidth={2}
          />

          {/* Hour markers */}
          <G>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const innerRadius = radius - 6;
              const outerRadius = radius - 2;
              return (
                <Line
                  key={i}
                  x1={center + innerRadius * Math.cos(angle)}
                  y1={center + innerRadius * Math.sin(angle)}
                  x2={center + outerRadius * Math.cos(angle)}
                  y2={center + outerRadius * Math.sin(angle)}
                  stroke={primaryColor}
                  strokeWidth={i % 3 === 0 ? 2 : 1}
                  strokeLinecap="round"
                />
              );
            })}
          </G>

          {/* Hour hand */}
          <Line
            x1={center}
            y1={center}
            x2={hourEnd.x}
            y2={hourEnd.y}
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <Line
            x1={center}
            y1={center}
            x2={minuteEnd.x}
            y2={minuteEnd.y}
            stroke={primaryColor}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Second hand */}
          <Line
            x1={center}
            y1={center}
            x2={secondEnd.x}
            y2={secondEnd.y}
            stroke={eventStarted ? '#6B7280' : '#EF4444'} // gray when stopped, red when active
            strokeWidth={1.5}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <Circle
            cx={center}
            cy={center}
            r={4}
            fill={primaryColor}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CountdownClock;
