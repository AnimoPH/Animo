import { Check, Clock, Store } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AnimoText } from "@/components/animo/animo-text";
import { AnimoColors, AnimoRadius, AnimoSpacing } from "@/constants/animo";

export function ProgressSteps() {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleDone]}>
          <Check size={16} color={AnimoColors.objectHighEmphasisInverse} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textAccentPrimary}
          style={styles.stepLabel}
        >
          Gumawa
        </AnimoText>
      </View>

      <View style={[styles.stepConnector, styles.stepConnectorDone]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleUpcoming]}>
          <Clock size={16} color={AnimoColors.objectLowEmphasis} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textLowEmphasis}
          style={styles.stepLabel}
        >
          Sinusuri
        </AnimoText>
      </View>

      <View style={[styles.stepConnector, styles.stepConnectorUpcoming]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleUpcoming]}>
          <Store size={16} color={AnimoColors.objectLowEmphasis} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textLowEmphasis}
          style={styles.stepLabel}
        >
          Available
        </AnimoText>
      </View>
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
