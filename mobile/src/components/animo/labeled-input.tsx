import { type ReactNode, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { AnimoText } from "@/components/animo/animo-text";
import {
  AnimoColors,
  AnimoRadius,
  AnimoSpacing,
  AnimoType,
} from "@/constants/animo";

export type LabeledInputProps = TextInputProps & {
  /** Label above the field. Omit to render just the field. */
  label?: string;
  /** Small helper text shown below the field. */
  hint?: string;
  /** Color tone for the hint text. */
  hintTone?: "muted" | "danger";
  /** Optional element rendered inside the field on the left (e.g. "+63"). */
  prefix?: ReactNode;
  /** Optional trailing text inside the field on the right (e.g. "kilo/kg"). */
  suffixText?: string;
  /** Render the field in the error (red border) state. */
  error?: boolean;
};

/** Text field with an optional label above and optional helper text below. */
export function LabeledInput({
  label,
  hint,
  hintTone = "muted",
  prefix,
  suffixText,
  error = false,
  style,
  ...rest
}: LabeledInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {label}
        </AnimoText>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        {prefix}
        <TextInput
          placeholderTextColor={AnimoColors.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />
        {suffixText ? (
          <AnimoText
            variant="body"
            color={AnimoColors.muted}
            style={styles.suffix}
          >
            {suffixText}
          </AnimoText>
        ) : null}
      </View>
      {hint ? (
        <AnimoText
          variant="caption"
          color={hintTone === "danger" ? AnimoColors.danger : AnimoColors.muted}
          style={styles.hint}
        >
          {hint}
        </AnimoText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: AnimoSpacing.sm,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
    overflow: "hidden",
  },
  fieldFocused: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  fieldError: {
    borderColor: AnimoColors.danger,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: AnimoSpacing.lg,
    color: AnimoColors.black,
    fontSize: AnimoType.body.fontSize,
    fontFamily: AnimoType.body.fontFamily,
  },
  suffix: {
    paddingRight: AnimoSpacing.lg,
  },
  hint: {
    fontStyle: "italic",
  },
});
