import type { LucideIcon } from "lucide-react-native";
import { Check, Clock, Store } from "lucide-react-native";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { AnimoText } from "@/components/animo/animo-text";
import { AnimoColors, AnimoRadius, AnimoSpacing } from "@/constants/animo";

type Step = { label: string; icon: LucideIcon };

const STEPS: Step[] = [
  { label: "Gumawa", icon: Check },
  { label: "Uploading", icon: Clock },
  { label: "Available", icon: Store },
];

export type ProgressStepsProps = {
  /** Zero-based index of the step to highlight as current/active. Defaults to 0. */
  currentStep?: number;
};

export function ProgressSteps({ currentStep = 0 }: ProgressStepsProps) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        const filled = isDone || isActive;
        const Icon = isDone ? Check : step.icon;

        return (
          <Fragment key={step.label}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, filled ? styles.stepCircleDone : styles.stepCircleUpcoming]}>
                <Icon
                  size={16}
                  color={filled ? AnimoColors.objectHighEmphasisInverse : AnimoColors.objectLowEmphasis}
                />
              </View>
              <AnimoText
                variant="caption"
                color={filled ? AnimoColors.textAccentPrimary : AnimoColors.textLowEmphasis}
                style={styles.stepLabel}
              >
                {step.label}
              </AnimoText>
            </View>

            {index < STEPS.length - 1 ? (
              <View
                style={[styles.stepConnector, filled ? styles.stepConnectorDone : styles.stepConnectorUpcoming]}
              />
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: AnimoRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: {
    backgroundColor: AnimoColors.accentSecondary,
  },
  stepCircleUpcoming: {
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  stepLabel: {
    marginTop: AnimoSpacing.xs,
    textAlign: "center",
  },
  stepConnector: {
    width: 70,
    // justifyContent: "space-between",
    height: 4,
    marginTop: 20,
    borderRadius: 99,
  },
  stepConnectorDone: {
    backgroundColor: AnimoColors.accentSecondary,
  },
  stepConnectorUpcoming: {
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
});
