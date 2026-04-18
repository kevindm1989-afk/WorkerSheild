import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { copyText } from "@/lib/clipboard";

export function CopyButton({
  text,
  label = "COPY",
  size = "sm",
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handle = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [text]);

  const isMd = size === "md";

  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        isMd ? styles.btnMd : styles.btnSm,
        {
          borderColor: copied ? colors.success : colors.primary,
          backgroundColor: copied
            ? colors.success
            : pressed
              ? colors.card
              : "transparent",
        },
      ]}
    >
      <Text
        style={[
          isMd ? styles.txtMd : styles.txtSm,
          { color: copied ? colors.primaryForeground : colors.primary },
        ]}
      >
        {copied ? "✓ COPIED" : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 3,
  },
  btnMd: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  txtSm: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.2,
  },
  txtMd: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.4,
  },
});
