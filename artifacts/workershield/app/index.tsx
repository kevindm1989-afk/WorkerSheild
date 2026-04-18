import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AgentChip } from "@/components/AgentChip";
import { Markdown } from "@/components/Markdown";
import { runAgentPipeline, type AgentState } from "@/lib/agentClient";

type Role = "Both Roles" | "Steward" | "JHSC";

const ROLES: Role[] = ["Both Roles", "Steward", "JHSC"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [local, setLocal] = useState("Unifor Local 1285");
  const [employer, setEmployer] = useState("Saputo Dairy Products Canada G.P.");
  const [role, setRole] = useState<Role>("Both Roles");
  const [caseHistory, setCaseHistory] = useState("");
  const [keyPeople, setKeyPeople] = useState("");
  const [problem, setProblem] = useState("");

  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [finalOut, setFinalOut] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const updateAgent = useCallback(
    (key: string, label: string, patch: Partial<AgentState>) => {
      setAgents((prev) => {
        const idx = prev.findIndex((a) => a.key === key);
        if (idx === -1) {
          return [
            ...prev,
            { key, label, status: "pending", ...patch } as AgentState,
          ];
        }
        const next = prev.slice();
        next[idx] = { ...next[idx]!, label, ...patch };
        return next;
      });
    },
    [],
  );

  const handleRun = useCallback(async () => {
    if (!problem.trim() || running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setRunning(true);
    setErrorMsg(null);
    setAgents([]);
    setFinalOut(null);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 9999, animated: true });
    }, 50);

    await runAgentPipeline(
      {
        local,
        employer,
        role,
        caseHistory,
        keyPeople,
        problem,
      },
      {
        onPending: (key, label) => updateAgent(key, label, { status: "pending" }),
        onRunning: (key, label) => {
          updateAgent(key, label, { status: "running" });
          Haptics.selectionAsync().catch(() => {});
        },
        onDone: (key, label, output) => {
          updateAgent(key, label, { status: "done", output });
          if (key === "final") {
            setFinalOut(output);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
            setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        },
        onError: (message) => {
          setErrorMsg(message);
          setRunning(false);
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
        },
        onComplete: () => {
          setRunning(false);
        },
      },
    );
  }, [
    problem,
    running,
    local,
    employer,
    role,
    caseHistory,
    keyPeople,
    updateAgent,
  ]);

  const reset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setProblem("");
    setAgents([]);
    setFinalOut(null);
    setErrorMsg(null);
    setRunning(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const specialistAgents = useMemo(
    () => agents.filter((a) => a.key !== "final" && a.output),
    [agents],
  );

  const showCanSubmit = problem.trim().length > 0 && !running;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}
      <View style={styles.header}>
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
      </View>

      {/* FORM */}
      <View style={styles.section}>
        <FieldLabel text="LOCAL / UNION" />
        <Input value={local} onChangeText={setLocal} />

        <View style={{ height: 14 }} />
        <FieldLabel text="EMPLOYER" />
        <Input value={employer} onChangeText={setEmployer} />

        <View style={{ height: 14 }} />
        <FieldLabel text="ROLE" />
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <Pressable
                key={r}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setRole(r);
                }}
                style={({ pressed }) => [
                  styles.roleBtn,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active
                      ? colors.primary
                      : pressed
                        ? colors.card
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBtnText,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {r.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 14 }} />
        <FieldLabel text="CASE HISTORY" optional />
        <Input
          value={caseHistory}
          onChangeText={setCaseHistory}
          multiline
          minHeight={70}
          placeholder="Prior incidents, grievances, related events…"
        />

        <View style={{ height: 14 }} />
        <FieldLabel text="KEY PEOPLE" optional />
        <Input
          value={keyPeople}
          onChangeText={setKeyPeople}
          multiline
          minHeight={70}
          placeholder="Names, titles, roles, relationships…"
        />

        <View style={{ height: 14 }} />
        <FieldLabel text="PROBLEM" />
        <Input
          value={problem}
          onChangeText={setProblem}
          multiline
          minHeight={140}
          placeholder="Describe what happened. Be specific. Include dates, names, and what management said."
        />
      </View>

      {/* ACTIVATE BUTTON */}
      <View style={styles.section}>
        <Pressable
          onPress={handleRun}
          disabled={!showCanSubmit}
          style={({ pressed }) => [
            styles.activateBtn,
            {
              backgroundColor: showCanSubmit
                ? pressed
                  ? "#B88A14"
                  : colors.primary
                : colors.muted,
              borderColor: showCanSubmit ? colors.primary : colors.border,
              opacity: running ? 0.85 : 1,
            },
          ]}
        >
          {running ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text
                style={[
                  styles.activateText,
                  { color: colors.primaryForeground },
                ]}
              >
                AGENTS DEPLOYED
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.activateText,
                {
                  color: showCanSubmit
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              ▲ ACTIVATE WORKERSHIELD
            </Text>
          )}
        </Pressable>
      </View>

      {/* AGENT STATUS */}
      {agents.length > 0 && (
        <View style={styles.section}>
          <SectionTitle text="AGENT PIPELINE" />
          <View style={styles.chipsWrap}>
            {agents.map((a) => (
              <AgentChip key={a.key} label={a.label} status={a.status} />
            ))}
          </View>
        </View>
      )}

      {/* ERROR */}
      {errorMsg && (
        <View style={styles.section}>
          <View
            style={[
              styles.errorCard,
              { borderColor: colors.danger, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.errorTitle, { color: colors.danger }]}>
              PIPELINE ERROR
            </Text>
            <Text style={{ color: colors.foreground, marginTop: 6 }}>
              {errorMsg}
            </Text>
          </View>
        </View>
      )}

      {/* SPECIALIST OUTPUT CARDS */}
      {specialistAgents.map((a) => (
        <View key={a.key} style={styles.section}>
          <View
            style={[
              styles.outputCard,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <View
              style={[
                styles.outputHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.outputTag, { color: colors.mutedForeground }]}>
                AGENT
              </Text>
              <Text
                style={[styles.outputTitle, { color: colors.foreground }]}
              >
                {a.label.toUpperCase()}
              </Text>
            </View>
            <View style={{ padding: 14 }}>
              <Markdown source={a.output ?? ""} />
            </View>
          </View>
        </View>
      ))}

      {/* FINAL CARD */}
      {finalOut && (
        <View style={styles.section}>
          <View
            style={[
              styles.finalCard,
              { borderColor: colors.primary, backgroundColor: colors.card },
            ]}
          >
            <View
              style={[
                styles.finalHeader,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.finalHeaderText,
                  { color: colors.primaryForeground },
                ]}
              >
                ★ WORKERSHIELD RESPONSE
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              <Markdown source={finalOut} />
            </View>
          </View>

          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.newProblemBtn,
              {
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.card : "transparent",
              },
            ]}
          >
            <Text style={[styles.newProblemText, { color: colors.primary }]}>
              + NEW PROBLEM
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {text}
      </Text>
      {optional && (
        <Text style={[styles.optional, { color: colors.mutedForeground }]}>
          OPTIONAL
        </Text>
      )}
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View style={[styles.sectionBar, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {text}
      </Text>
    </View>
  );
}

function Input(props: {
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  minHeight?: number;
  placeholder?: string;
}) {
  const colors = useColors();
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      multiline={props.multiline}
      placeholder={props.placeholder}
      placeholderTextColor={colors.mutedForeground}
      style={[
        styles.input,
        {
          color: colors.foreground,
          borderColor: colors.border,
          backgroundColor: colors.card,
          minHeight: props.minHeight ?? 44,
          textAlignVertical: props.multiline ? "top" : "center",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shield: {
    width: 44,
    height: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  shieldText: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  brand: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.4,
    marginTop: 2,
  },
  divider: {
    height: 2,
    marginTop: 14,
  },
  section: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  optional: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
  },
  roleBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  activateBtn: {
    paddingVertical: 18,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  activateText: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 2,
  },
  sectionBar: { width: 3, height: 14 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
  },
  errorTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  outputCard: {
    borderWidth: 1,
    borderRadius: 4,
  },
  outputHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  outputTag: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
  },
  outputTitle: {
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.4,
  },
  finalCard: {
    borderWidth: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  finalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  finalHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 2,
  },
  newProblemBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
  },
  newProblemText: {
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.6,
  },
});
