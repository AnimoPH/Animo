import { CloudOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useOutboxItems } from '@/hooks/use-outbox-items';
import { useSession } from '@/hooks/use-session';
import { flushOutbox, removeOutboxItem, resendListingWithPrice, type OutboxItem } from '@/lib/outbox';
import { deleteOutboxPhotos } from '@/lib/outbox/photo-files';
import { refusalReason } from '@/lib/outbox/refusal-reason';

/** "price changed: 18.83" -> 18.83 */
function newPriceFrom(item: OutboxItem): number | null {
  const match = item.lastError?.match(/price changed:\s*([0-9.]+)/i);
  return match ? Number(match[1]) : null;
}

/**
 * Shows what the phone saved while offline and could not send yet. A listing
 * the server refused because the feed peso changed waits here until the
 * farmer confirms the new peso or drops it. `rightInset` keeps it clear of a
 * button on the right edge, like the + on Aking Ani.
 */
export function OutboxBanner({ rightInset = 0 }: { rightInset?: number }) {
  const { isTagalog } = useLanguage();
  const { account } = useSession();
  const items = useOutboxItems(account?.id ?? null);
  const [reviewing, setReviewing] = useState(false);

  const waiting = items.filter((item) => item.status === 'pending' || item.status === 'sending');
  const stuck = items.find((item) => item.status === 'needs_review' || item.status === 'failed');
  if (waiting.length === 0 && !stuck) return null;

  const stuckPrice = stuck?.status === 'needs_review' ? newPriceFrom(stuck) : null;

  const drop = async (item: OutboxItem) => {
    await removeOutboxItem(item.id);
    await deleteOutboxPhotos(item.id);
    setReviewing(false);
  };

  const confirmNewPrice = async () => {
    if (!stuck || stuckPrice === null) return;
    await resendListingWithPrice(stuck as OutboxItem<'create_listing'>, stuckPrice);
    setReviewing(false);
    if (account) flushOutbox(account.id).catch(() => {});
  };

  const text = stuck
    ? stuck.status === 'needs_review'
      ? isTagalog
        ? 'Nagbago ang presyo ng isang listing. Pindutin para tingnan.'
        : 'The price of a listing changed. Tap to review.'
      : isTagalog
        ? 'May isang hindi naipadala. Pindutin para tingnan.'
        : 'One saved action could not be sent. Tap to review.'
    : isTagalog
      ? `May ${waiting.length} na naka-save sa phone. Ipapadala kapag may signal.`
      : `${waiting.length} saved on this phone. Sent when there is a signal.`;

  return (
    <>
      <Pressable
        style={[styles.banner, rightInset > 0 && { right: AnimoSpacing.lg + rightInset }]}
        disabled={!stuck}
        onPress={() => setReviewing(true)}
        accessibilityRole={stuck ? 'button' : 'text'}>
        <CloudOff size={18} color={AnimoColors.textHighEmphasis} />
        <View style={styles.textWrap}>
          <AnimoText variant="caption" color={AnimoColors.textHighEmphasis}>
            {text}
          </AnimoText>
        </View>
      </Pressable>

      {stuck ? (
        <FeedbackModal
          visible={reviewing}
          tone="warning"
          title={
            stuck.status === 'needs_review'
              ? isTagalog ? 'Nagbago ang presyo' : 'The price changed'
              : isTagalog ? 'Hindi naipadala' : 'Could not be sent'
          }
          message={
            stuck.status === 'needs_review' && stuckPrice !== null
              ? isTagalog
                ? `Habang offline ka, nagbago ang presyo. Ang bagong presyo ay ${formatPeso(stuckPrice)}/kg. Ipadala pa rin ang listing sa presyong ito?`
                : `The price changed while you were offline. The new price is ${formatPeso(stuckPrice)}/kg. Send the listing at this price?`
              : `${refusalReason(stuck.lastError, isTagalog)} ${
                  isTagalog ? 'Alisin ito at subukan muli kung kailangan.' : 'Remove it and try again if you still need it.'
                }`
          }
          confirmLabel={
            stuck.status === 'needs_review' && stuckPrice !== null
              ? isTagalog ? 'Ipadala sa bagong presyo' : 'Send at new price'
              : isTagalog ? 'Alisin' : 'Remove'
          }
          onConfirm={() => {
            if (stuck.status === 'needs_review' && stuckPrice !== null) void confirmNewPrice();
            else void drop(stuck);
          }}
          secondaryLabel={
            stuck.status === 'needs_review' && stuckPrice !== null
              ? isTagalog ? 'Alisin ang listing' : 'Remove listing'
              : isTagalog ? 'Isara' : 'Close'
          }
          onSecondary={() => {
            if (stuck.status === 'needs_review' && stuckPrice !== null) void drop(stuck);
            else setReviewing(false);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: AnimoSpacing.lg,
    right: AnimoSpacing.lg,
    bottom: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    backgroundColor: '#FDF6E4',
    borderWidth: 1,
    borderColor: '#E9D8A6',
  },
  textWrap: { flex: 1 },
});
