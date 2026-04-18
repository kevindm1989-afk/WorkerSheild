import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { parseMarkdown, type InlineSpan, type MdNode } from "@/lib/markdown";

function renderSpans(spans: InlineSpan[], baseStyle: object) {
  return spans.map((s, idx) => (
    <Text
      key={idx}
      style={[
        baseStyle,
        s.bold && { fontFamily: "Inter_700Bold" },
        s.italic && { fontStyle: "italic" as const },
      ]}
    >
      {s.text}
    </Text>
  ));
}

export function Markdown({ source }: { source: string }) {
  const colors = useColors();
  const nodes = React.useMemo(() => parseMarkdown(source), [source]);

  return (
    <View>
      {nodes.map((node, i) => (
        <NodeView
          key={i}
          node={node}
          fg={colors.foreground}
          accent={colors.primary}
          muted={colors.mutedForeground}
        />
      ))}
    </View>
  );
}

function NodeView({
  node,
  fg,
  accent,
  muted,
}: {
  node: MdNode;
  fg: string;
  accent: string;
  muted: string;
}) {
  switch (node.type) {
    case "h1":
      return (
        <Text style={[styles.h1, { color: fg }]}>
          {renderSpans(node.text, { ...styles.h1, color: fg })}
        </Text>
      );
    case "h2":
      return (
        <View style={styles.h2Wrap}>
          <View style={[styles.h2Bar, { backgroundColor: accent }]} />
          <Text style={[styles.h2, { color: fg }]}>
            {renderSpans(node.text, { ...styles.h2, color: fg })}
          </Text>
        </View>
      );
    case "h3":
      return (
        <Text style={[styles.h3, { color: accent }]}>
          {renderSpans(node.text, { ...styles.h3, color: accent })}
        </Text>
      );
    case "bullet":
      return (
        <View style={styles.row}>
          <Text style={[styles.bulletDot, { color: accent }]}>■</Text>
          <Text style={[styles.body, { color: fg, flex: 1 }]}>
            {renderSpans(node.text, { ...styles.body, color: fg })}
          </Text>
        </View>
      );
    case "ordered":
      return (
        <View style={styles.row}>
          <Text style={[styles.bulletNum, { color: accent }]}>
            {node.index}.
          </Text>
          <Text style={[styles.body, { color: fg, flex: 1 }]}>
            {renderSpans(node.text, { ...styles.body, color: fg })}
          </Text>
        </View>
      );
    case "blank":
      return <View style={{ height: 6 }} />;
    case "p":
    default:
      return (
        <Text style={[styles.body, { color: fg }]}>
          {renderSpans(node.text, { ...styles.body, color: fg })}
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  h2Wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  h2Bar: { width: 3, height: 14 },
  h2: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  h3: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginVertical: 2,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 2,
    paddingLeft: 2,
  },
  bulletDot: {
    fontSize: 10,
    lineHeight: 21,
    paddingTop: 1,
  },
  bulletNum: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 21,
    minWidth: 20,
  },
});
