import {
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Lock,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { IconButton } from '@/components/animo/ui/screen-bits';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { AnimoV2Colors, AnimoV2Font, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import {
  FaqItem,
  LEGAL_CONTENT,
  LegalSection,
  LegalTabKey,
} from '@/constants/legal-content';
import { useLanguage } from '@/hooks/use-language';

export type LegalModalProps = {
  visible: boolean;
  initialTab?: LegalTabKey;
  onClose: () => void;
};

const TAB_ICON: Record<LegalTabKey, LucideIcon> = {
  terms: FileText,
  privacy: Lock,
  faq: HelpCircle,
};

export function LegalModal({
  visible,
  initialTab = 'terms',
  onClose,
}: LegalModalProps) {
  const { language, isTagalog } = useLanguage();
  const [activeTab, setActiveTab] = useState<LegalTabKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Sync tab when initialTab changes on open
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [visible, initialTab]);

  const content = LEGAL_CONTENT[language] || LEGAL_CONTENT.tl;

  const filteredFaqs = useMemo(() => {
    const rawFaqs: readonly FaqItem[] = content.faq.items;
    return rawFaqs.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [content.faq.items, selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const HeaderIcon = TAB_ICON[activeTab];
  const title =
    activeTab === 'terms' ? content.terms.title : activeTab === 'privacy' ? content.privacy.title : content.faq.title;
  const subtitle =
    activeTab === 'terms'
      ? content.terms.subtitle
      : activeTab === 'privacy'
        ? content.privacy.subtitle
        : content.faq.subtitle;

  const renderSections = (sections: readonly LegalSection[], banner: string) => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.banner}>
        <ShieldCheck size={22} color={AnimoV2Colors.successFg} strokeWidth={2.5} />
        <AnimoText variant="captionV2" color={AnimoV2Colors.successFg} style={styles.flex}>
          {banner}
        </AnimoText>
      </View>

      {sections.map((sec, secIndex) => (
        <DepthCard key={sec.id} depth="flat" radius="lg" style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionNumber}>
              <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
                {secIndex + 1}
              </AnimoText>
            </View>
            <AnimoText variant="subheading" style={styles.flex}>
              {sec.title}
            </AnimoText>
          </View>

          {sec.paragraphs.map((p, idx) => (
            <AnimoText key={idx} variant="bodyV2" color={AnimoV2Colors.textSecondary}>
              {p}
            </AnimoText>
          ))}

          {sec.bulletPoints && sec.bulletPoints.length > 0 ? (
            <View style={styles.bulletList}>
              {sec.bulletPoints.map((b, bIdx) => (
                <View key={bIdx} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                    {b}
                  </AnimoText>
                </View>
              ))}
            </View>
          ) : null}
        </DepthCard>
      ))}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <IconTile icon={HeaderIcon} tone="success" size={48} />
          <View style={styles.flex}>
            <AnimoText variant="heading" numberOfLines={1} accessibilityRole="header">
              {title}
            </AnimoText>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
              {subtitle}
            </AnimoText>
          </View>
          <IconButton
            icon={<X size={26} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />}
            label={isTagalog ? 'Isara' : 'Close'}
            onPress={onClose}
          />
        </View>

        {activeTab === 'terms' &&
          renderSections(
            content.terms.sections,
            isTagalog
              ? 'Batas at Regulasyon: E-Commerce Act (RA 8792) · Consumer Act (RA 7394)'
              : 'Compliance: Philippine E-Commerce Act (RA 8792) · Consumer Act (RA 7394)',
          )}

        {activeTab === 'privacy' &&
          renderSections(
            content.privacy.sections,
            isTagalog
              ? 'Protektado alinsunod sa Data Privacy Act of 2012 (RA 10173)'
              : 'Protected pursuant to the Data Privacy Act of 2012 (RA 10173)',
          )}

        {activeTab === 'faq' && (
          <View style={styles.flex}>
            {/* Search */}
            <View style={styles.searchBar}>
              <Search size={22} color={AnimoV2Colors.textTertiary} strokeWidth={2.5} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel={isTagalog ? 'Maghanap ng tanong' : 'Search questions'}
                placeholder={
                  isTagalog
                    ? 'Maghanap ng tanong o paksa...'
                    : 'Search questions or topics...'
                }
                placeholderTextColor={AnimoV2Colors.textTertiary}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isTagalog ? 'Burahin ang hinahanap' : 'Clear search'}
                  onPress={() => setSearchQuery('')}
                  hitSlop={10}>
                  <X size={20} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
                </Pressable>
              ) : null}
            </View>

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}>
              {content.faq.categories.map((cat) => (
                <FilterChip
                  key={cat.id}
                  label={cat.label}
                  compact
                  selected={selectedCategory === cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                />
              ))}
            </ScrollView>

            {/* FAQ list */}
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {filteredFaqs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <IconTile icon={HelpCircle} tone="neutral" size={72} />
                  <AnimoText variant="heading" style={styles.centerText}>
                    {isTagalog
                      ? 'Walang nahanap na katugmang tanong.'
                      : 'No matching questions found.'}
                  </AnimoText>
                  <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                    {isTagalog
                      ? 'Subukang maghanap ng ibang keyword tulad ng "presyo", "palay", o "GCash".'
                      : 'Try searching other terms like "price", "moisture", or "GCash".'}
                  </AnimoText>
                </View>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <DepthCard
                      key={faq.id}
                      depth={isExpanded ? 'raised' : 'flat'}
                      radius="lg"
                      backgroundColor={isExpanded ? AnimoV2Colors.surfaceBrandSubtle : AnimoV2Colors.surfaceCard}
                      borderColor={isExpanded ? AnimoV2Colors.actionPrimary : AnimoV2Colors.borderDefault}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isExpanded }}
                        accessibilityLabel={faq.question}
                        onPress={() => toggleFaq(faq.id)}
                        style={styles.faqRow}>
                        <View style={styles.flex}>
                          <View style={styles.faqCategory}>
                            <AnimoText variant="tagV2" color={AnimoV2Colors.successFg}>
                              {faq.categoryLabel}
                            </AnimoText>
                          </View>
                          <AnimoText variant="bodyStrong" style={styles.faqQuestion}>
                            {faq.question}
                          </AnimoText>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={24} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
                        ) : (
                          <ChevronDown size={24} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
                        )}
                      </Pressable>

                      {isExpanded ? (
                        <View style={styles.faqAnswer}>
                          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                            {faq.answer}
                          </AnimoText>
                        </View>
                      ) : null}
                    </DepthCard>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <ChunkyButton label={isTagalog ? 'Naiintindihan Ko' : 'I Understand'} onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    borderWidth: 2,
    borderColor: AnimoV2Colors.brandLight,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
  },
  sectionCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md, marginBottom: AnimoV2Spacing.xs },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AnimoV2Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletList: { gap: AnimoV2Spacing.sm, marginTop: AnimoV2Spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.md },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoV2Colors.actionPrimary,
    marginTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    minHeight: AnimoV2Size.controlHeight,
    marginHorizontal: AnimoV2Spacing.lg,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  searchInput: {
    flex: 1,
    fontFamily: AnimoV2Font.regular,
    fontSize: 16,
    color: AnimoV2Colors.textPrimary,
    paddingVertical: 0,
  },
  chipScroll: { flexGrow: 0, marginTop: AnimoV2Spacing.md },
  chipRow: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xs,
    gap: AnimoV2Spacing.sm,
    alignItems: 'center',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.lg,
    minHeight: 72,
  },
  faqCategory: {
    alignSelf: 'flex-start',
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingVertical: 2,
    borderRadius: AnimoV2Radius.full,
  },
  faqQuestion: { marginTop: AnimoV2Spacing.xs },
  faqAnswer: { paddingHorizontal: AnimoV2Spacing.lg, paddingBottom: AnimoV2Spacing.lg },
  emptyWrap: {
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingVertical: AnimoV2Spacing.xxl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  footer: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
});
