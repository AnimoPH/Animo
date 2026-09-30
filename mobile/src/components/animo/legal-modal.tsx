import {
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Lock,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              {activeTab === 'terms' && (
                <FileText size={20} color={AnimoColors.accentPrimary} />
              )}
              {activeTab === 'privacy' && (
                <Lock size={20} color={AnimoColors.accentPrimary} />
              )}
              {activeTab === 'faq' && (
                <HelpCircle size={20} color={AnimoColors.accentPrimary} />
              )}
            </View>
            <View style={styles.flex}>
              <AnimoText
                variant="h2"
                color={AnimoColors.textHighEmphasis}
                numberOfLines={1}>
                {activeTab === 'terms' && content.terms.title}
                {activeTab === 'privacy' && content.privacy.title}
                {activeTab === 'faq' && content.faq.title}
              </AnimoText>
              <AnimoText
                variant="caption"
                color={AnimoColors.textLowEmphasis}
                numberOfLines={1}>
                {activeTab === 'terms' && content.terms.subtitle}
                {activeTab === 'privacy' && content.privacy.subtitle}
                {activeTab === 'faq' && content.faq.subtitle}
              </AnimoText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            hitSlop={12}
            onPress={onClose}
            style={styles.closeBtn}>
            <X size={22} color={AnimoColors.textHighEmphasis} />
          </Pressable>
        </View>

        {/* Tab 1: Terms & Conditions */}
        {activeTab === 'terms' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.badgeBanner}>
              <ShieldCheck size={18} color={AnimoColors.accentPrimary} />
              <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                {isTagalog
                  ? 'Batas at Regulasyon: E-Commerce Act (RA 8792) · Consumer Act (RA 7394)'
                  : 'Compliance: Philippine E-Commerce Act (RA 8792) · Consumer Act (RA 7394)'}
              </AnimoText>
            </View>

            {content.terms.sections.map((sec: LegalSection) => (
              <View key={sec.id} style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.flex}>
                    {sec.title}
                  </AnimoText>
                </View>

                {sec.paragraphs.map((p, idx) => (
                  <AnimoText
                    key={idx}
                    variant="body"
                    color={AnimoColors.textMediumEmphasis}
                    style={styles.paragraph}>
                    {p}
                  </AnimoText>
                ))}

                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <View style={styles.bulletList}>
                    {sec.bulletPoints.map((b, bIdx) => (
                      <View key={bIdx} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <AnimoText
                          variant="body"
                          color={AnimoColors.textMediumEmphasis}
                          style={styles.bulletText}>
                          {b}
                        </AnimoText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Tab 2: Privacy Policy */}
        {activeTab === 'privacy' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.badgeBanner}>
              <ShieldCheck size={18} color={AnimoColors.accentPrimary} />
              <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                {isTagalog
                  ? 'Protektado alinsunod sa Data Privacy Act of 2012 (RA 10173)'
                  : 'Protected pursuant to the Data Privacy Act of 2012 (RA 10173)'}
              </AnimoText>
            </View>

            {content.privacy.sections.map((sec: LegalSection) => (
              <View key={sec.id} style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.flex}>
                    {sec.title}
                  </AnimoText>
                </View>

                {sec.paragraphs.map((p, idx) => (
                  <AnimoText
                    key={idx}
                    variant="body"
                    color={AnimoColors.textMediumEmphasis}
                    style={styles.paragraph}>
                    {p}
                  </AnimoText>
                ))}

                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <View style={styles.bulletList}>
                    {sec.bulletPoints.map((b, bIdx) => (
                      <View key={bIdx} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <AnimoText
                          variant="body"
                          color={AnimoColors.textMediumEmphasis}
                          style={styles.bulletText}>
                          {b}
                        </AnimoText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Tab 3: FAQ Accordion */}
        {activeTab === 'faq' && (
          <View style={styles.flex}>
            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Search size={18} color={AnimoColors.textLowEmphasis} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  isTagalog
                    ? 'Maghanap ng tanong o paksa...'
                    : 'Search questions or topics...'
                }
                placeholderTextColor={AnimoColors.textLowEmphasis}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color={AnimoColors.textLowEmphasis} />
                </Pressable>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
              style={styles.categoryChipsWrap}>
              {content.faq.categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}>
                    <AnimoText
                      variant="caption"
                      color={
                        isActive
                          ? AnimoColors.white
                          : AnimoColors.textMediumEmphasis
                      }
                      style={{ fontWeight: isActive ? '600' : '400' }}>
                      {cat.label}
                    </AnimoText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* FAQs List */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {filteredFaqs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <HelpCircle size={36} color={AnimoColors.textDisabled} />
                  <AnimoText
                    variant="bodyEmphasis"
                    color={AnimoColors.textMediumEmphasis}
                    style={{ marginTop: 8 }}>
                    {isTagalog
                      ? 'Walang nahanap na katugmang tanong.'
                      : 'No matching questions found.'}
                  </AnimoText>
                  <AnimoText
                    variant="caption"
                    color={AnimoColors.textLowEmphasis}
                    style={{ textAlign: 'center', marginTop: 4 }}>
                    {isTagalog
                      ? 'Subukang maghanap ng ibang keyword tulad ng "presyo", "palay", o "GCash".'
                      : 'Try searching other terms like "price", "moisture", or "GCash".'}
                  </AnimoText>
                </View>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <View key={faq.id} style={styles.faqCard}>
                      <Pressable
                        onPress={() => toggleFaq(faq.id)}
                        style={styles.faqQuestionRow}>
                        <View style={styles.faqQuestionLeft}>
                          <View style={styles.faqCategoryBadge}>
                            <AnimoText
                              variant="caption"
                              color={AnimoColors.accentPrimary}
                              style={styles.faqCategoryText}>
                              {faq.categoryLabel}
                            </AnimoText>
                          </View>
                          <AnimoText
                            variant="bodyEmphasis"
                            color={AnimoColors.textHighEmphasis}
                            style={styles.faqQuestionText}>
                            {faq.question}
                          </AnimoText>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={AnimoColors.accentPrimary} />
                        ) : (
                          <ChevronDown size={20} color={AnimoColors.textLowEmphasis} />
                        )}
                      </Pressable>

                      {isExpanded && (
                        <View style={styles.faqAnswerWrap}>
                          <View style={styles.divider} />
                          <AnimoText
                            variant="body"
                            color={AnimoColors.textMediumEmphasis}
                            style={styles.faqAnswerText}>
                            {faq.answer}
                          </AnimoText>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* Modal Footer */}
        <View style={styles.footer}>
          <AnimoButton
            label={isTagalog ? 'Naiintindihan Ko' : 'I Understand'}
            onPress={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AnimoColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    flex: 1,
    marginRight: AnimoSpacing.sm,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  closeBtn: {
    padding: AnimoSpacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    gap: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.xxl,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.sm,
  },
  sectionCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.sm,
  },
  paragraph: {
    lineHeight: 20,
    marginBottom: 6,
  },
  bulletList: {
    marginTop: 4,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AnimoColors.accentPrimary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    paddingHorizontal: AnimoSpacing.md,
    marginHorizontal: AnimoSpacing.lg,
    marginTop: AnimoSpacing.sm,
    height: 44,
    gap: AnimoSpacing.sm,
  },
  searchInput: {
    flex: 1,
    ...AnimoType.body,
    color: AnimoColors.textHighEmphasis,
    paddingVertical: 0,
  },
  categoryChipsWrap: {
    maxHeight: 46,
    marginTop: AnimoSpacing.sm,
    marginBottom: 4,
  },
  categoryChipsScroll: {
    paddingHorizontal: AnimoSpacing.lg,
    gap: AnimoSpacing.xs,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfaceTertiary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  faqCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
  faqQuestionLeft: {
    flex: 1,
    gap: 4,
  },
  faqCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  faqCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  faqQuestionText: {
    marginTop: 2,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingHorizontal: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AnimoColors.border,
    marginBottom: AnimoSpacing.sm,
  },
  faqAnswerText: {
    lineHeight: 21,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AnimoSpacing.xxl,
    paddingHorizontal: AnimoSpacing.lg,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AnimoColors.border,
  },
});
