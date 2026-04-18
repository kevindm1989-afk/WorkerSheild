import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "workershield.onboarded.v1";

export function useOnboarding(): {
  status: "loading" | "needed" | "done";
  markDone: () => void;
} {
  const [status, setStatus] = useState<"loading" | "needed" | "done">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!active) return;
        setStatus(v === "1" ? "done" : "needed");
      })
      .catch(() => {
        if (active) setStatus("needed");
      });
    return () => {
      active = false;
    };
  }, []);

  const markDone = () => {
    setStatus("done");
    AsyncStorage.setItem(STORAGE_KEY, "1").catch(() => {});
  };

  return { status, markDone };
}

const STEPS: { tag: string; title: string; body: string }[] = [
  {
    tag: "01 / INPUT",
    title: "DESCRIBE THE PROBLEM",
    body: "Type or dictate what happened — dates, names, what management said, what the worker did. The more specific, the stronger the analysis.",
  },
  {
    tag: "02 / ANALYZE",
    title: "10 AI AGENTS DEPLOY",
    body: "An Intake agent identifies the legal issues, then up to 8 specialists run in parallel — OHSA, the Saputo collective agreement, ESA, OHRC, evidence, MOL, formal correspondence, and arbitration prep.",
  },
  {
    tag: "03 / VERIFY",
    title: "QUALITY CONTROL",
    body: "A QC agent reviews every output for incorrect statute citations, missed deadlines, and reprisal risks before anything reaches you.",
  },
  {
    tag: "04 / ACT",
    title: "TAKE THE NEXT STEP",
    body: "Get a clear response: legal position, immediate steps, documentation required, and escalation path. Save it as PDF for your union file.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 22,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <View style={styles.brandRow}>
          <View style={[styles.shield, { borderColor: colors.primary }]}>
            <Text style={[styles.shieldText, { color: colors.primary }]}>W</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: colors.foreground }]}>
              WORKERSHIELD
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              ONTARIO LABOUR DEFENSE • MULTI-AGENT
            </Text>
          </View>
        </View>

        <View
          style={[styles.divider, { backgroundColor: colors.primary }]}
        />

        <Text style={[styles.lead, { color: colors.foreground }]}>
          Built for{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_800ExtraBold" }}>
            stewards
          </Text>{" "}
          and{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_800ExtraBold" }}>
            JHSC co-chairs
          </Text>{" "}
          who need a real legal analysis on the floor — not in a week.
        </Text>

        {STEPS.map((s) => (
          <View
            key={s.tag}
            style={[
              styles.step,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <View
              style={[styles.stepBar, { backgroundColor: colors.primary }]}
            />
            <View style={styles.stepBody}>
              <Text style={[styles.stepTag, { color: colors.primary }]}>
                {s.tag}
              </Text>
              <Text
                style={[styles.stepTitle, { color: colors.foreground }]}
              >
                {s.title}
              </Text>
              <Text
                style={[styles.stepText, { color: colors.mutedForeground }]}
              >
                {s.body}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.disclaimer,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.disclaimerTag, { color: colors.primary }]}>
            ⚠ NOT A LAWYER
          </Text>
          <Text style={[styles.disclaimerText, { color: colors.foreground }]}>
            WorkerShield is an AI tool. Always verify critical decisions with
            your union representative or legal counsel before acting. Outputs
            are guidance, not legal advice.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {},
            );
            onDone();
          }}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: pressed ? "#B88A14" : colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            ▲ ENTER WORKERSHIELD
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OnboardingLoader() {
  const colors = useColors();
  return (
    <View
      style={[
        { flex: 1, alignItems: "center", justifyContent: "center" },
        { backgroundColor: colors.background },
      ]}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  shield: {
    width: 50,
    height: 58,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  shieldText: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
  },
  brand: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 2.2,
  },
  tagline: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.4,
    marginTop: 3,
  },
  divider: {
    height: 2,
    marginTop: 16,
    marginBottom: 22,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
  },
  step: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  stepBar: { width: 4 },
  stepBody: {
    flex: 1,
    padding: 14,
  },
  stepTag: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  disclaimer: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginTop: 8,
  },
  disclaimerTag: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  cta: {
    paddingVertical: 18,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 2,
  },
});
