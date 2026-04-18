import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { AgentStatus } from "@/lib/agentClient";

interface Props {
  label: string;
  status: AgentStatus;
}

export function AgentChip({ label, status }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "running") {
      pulse.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
    return undefined;
  }, [status, pulse]);

  const isPending = status === "pending";
  const isRunning = status === "running";
  const isDone = status === "done";

  const dotColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, "#FFD86A"],
  });

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isPending ? "transparent" : colors.card,
          borderColor: isDone
            ? colors.primary
            : isRunning
              ? colors.primary
              : colors.border,
        },
      ]}
    >
      {isDone ? (
        <View
          style={[
            styles.checkBox,
            { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.check, { color: colors.primaryForeground }]}>
            ✓
          </Text>
        </View>
      ) : isRunning ? (
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: dotColor },
          ]}
        />
      ) : (
        <View
          style={[
            styles.dot,
            { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: isPending ? colors.mutedForeground : colors.foreground,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkBox: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
