import { router, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import {
  InlineError,
  MoistureGradeFields,
  PhotoSlotGrid,
  PhotoSourceSheetV2,
  VarietyFields,
  WeightFields,
} from '@/components/animo/farmer/listing-form-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  fetchCropListing,
  fetchListingPhotos,
  listingHasActiveDeal,
  updateCropListing,
  uploadListingPhoto,
} from '@/services/crop-listing-service';
import {
  SPECIFIC_VARIETY_OTHER,
  getHybridSpecificVarieties,
  getInbredSpecificVarieties,
  type DeclaredVariety,
  type MoistureType,
  type PhotoType,
  type PurityGrade,
  type SpecificVarietyOption,
  type VarietyCode,
} from '@/types/crop-listing';

async function toUploadableJpeg(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1440 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    return manipResult.uri;
  } catch {
    return uri;
  }
}

function resolveSpecificVariety(
  variety: DeclaredVariety,
  name: string | null,
  custom: string | null,
  lang: 'tl' | 'en' = 'tl',
): SpecificVarietyOption | null {
  if (!name || (variety !== 'Inbred' && variety !== 'Hybrid')) return null;
  const options =
    variety === 'Inbred' ? getInbredSpecificVarieties(lang) : getHybridSpecificVarieties(lang);
  const found = options.find((o) => o.value === name);
  if (found) return found;
  if (name === SPECIFIC_VARIETY_OTHER) {
    return { value: SPECIFIC_VARIETY_OTHER, label: lang === 'en' ? 'Other' : 'Iba pa', varietyCode: 'OTHER' };
  }
  return null;
}

/** Edit an existing listing — same fields as create; locks non-cosmetic when an active deal exists. */
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [cosmeticOnly, setCosmeticOnly] = useState(false);
  const [originalNet, setOriginalNet] = useState(0);
  const [originalRemaining, setOriginalRemaining] = useState(0);

  const [variety, setVariety] = useState<DeclaredVariety | ''>('');
  const [listingName, setListingName] = useState('');
  const [customVariety, setCustomVariety] = useState('');
  const [specificVariety, setSpecificVariety] = useState<SpecificVarietyOption | null>(null);
  const [specificVarietyCustom, setSpecificVarietyCustom] = useState('');
  const [moistureType, setMoistureType] = useState<MoistureType>('Dry');
  const [purityGrade, setPurityGrade] = useState<PurityGrade | ''>('');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [photos, setPhotos] = useState<Partial<Record<PhotoType, string>>>({});
  const [dirtyPhotoSlots, setDirtyPhotoSlots] = useState<Set<PhotoType>>(new Set());
  const [activeSlot, setActiveSlot] = useState<PhotoType | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    (async () => {
      setLoading(true);
      setLoadError(undefined);
      try {
        const [listing, active, listingPhotos] = await Promise.all([
          fetchCropListing(id),
          listingHasActiveDeal(id),
          fetchListingPhotos(id),
        ]);
        if (cancelled) return;
        if (!listing) {
          setLoadError(isTagalog ? 'Hindi nahanap ang listing.' : 'Listing not found.');
          return;
        }
        if (listing.status === 'Archived') {
          setLoadError(isTagalog ? 'Hindi na maaaring i-edit ang naka-archive na listing.' : 'Archived listings cannot be edited.');
          return;
        }

        setCosmeticOnly(active);
        setListingName(listing.listingName);
        setVariety(listing.declaredVariety);
        setCustomVariety(listing.declaredVarietyCustom ?? '');
        setSpecificVariety(
          resolveSpecificVariety(
            listing.declaredVariety,
            listing.specificVarietyName,
            listing.specificVarietyNameCustom,
            language,
          ),
        );
        setSpecificVarietyCustom(listing.specificVarietyNameCustom ?? '');
        setMoistureType(listing.declaredMoisture);
        setPurityGrade(listing.declaredPurityGrade);
        setGrossWeight(String(listing.grossWeightKg));
        setTareWeight(String(listing.tareWeightKg));
        setOriginalNet(listing.netWeightKg);
        setOriginalRemaining(listing.remainingQuantityKg);

        const photoMap: Partial<Record<PhotoType, string>> = {};
        listingPhotos.forEach((p) => {
          photoMap[p.photoType] = p.url;
        });
        setPhotos(photoMap);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : (isTagalog ? 'Hindi ma-load ang listing.' : 'Failed to load listing.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, language, isTagalog]);

  const netWeight = Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0));
  const needsSpecificVariety = variety === 'Inbred' || variety === 'Hybrid';
  const specificVarietyOptions =
    variety === 'Inbred'
      ? getInbredSpecificVarieties(language)
      : variety === 'Hybrid'
        ? getHybridSpecificVarieties(language)
        : [];
  const varietyCode: VarietyCode = needsSpecificVariety
    ? (specificVariety?.varietyCode ?? 'OTHER')
    : 'OTHER';

  const canSubmit =
    listingName.trim().length > 0 &&
    (cosmeticOnly ||
      (variety !== '' &&
        (variety !== 'Others' || customVariety.trim().length > 0) &&
        (!needsSpecificVariety || specificVariety !== null) &&
        (specificVariety?.value !== SPECIFIC_VARIETY_OTHER ||
          specificVarietyCustom.trim().length > 0) &&
        purityGrade !== '' &&
        netWeight > 0));

  const handleClearPhoto = (slot: PhotoType) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setDirtyPhotoSlots((prev) => {
      const next = new Set(prev);
      next.delete(slot);
      return next;
    });
  };

  const handlePickSource = async (source: 'camera' | 'gallery') => {
    const slot = activeSlot;
    setActiveSlot(null);
    if (!slot) return;

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage(
        permission.canAskAgain
          ? (isTagalog ? 'Kailangan ng pahintulot para makakuha ng larawan.' : 'Permission required to capture photos.')
          : (isTagalog ? 'Kailangan ng pahintulot. Buksan ang Settings ng telepono para payagan ang ANIMO.' : 'Permission required. Open phone Settings to allow ANIMO.'),
      );
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.[0]) return;

    try {
      const uploadableUri = await toUploadableJpeg(result.assets[0].uri);
      setPhotos((prev) => ({ ...prev, [slot]: uploadableUri }));
      setDirtyPhotoSlots((prev) => new Set(prev).add(slot));
      setErrorMessage(undefined);
    } catch {
      setErrorMessage(isTagalog ? 'Hindi maproseso ang larawan. Subukan muli.' : 'Failed to process photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (submitting || !id || !canSubmit) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      if (cosmeticOnly) {
        await updateCropListing(id, { listingName: listingName.trim() });
      } else {
        if (!variety || !purityGrade) return;
        const remaining =
          originalRemaining === originalNet
            ? netWeight
            : Math.min(originalRemaining, netWeight);
        await updateCropListing(id, {
          listingName: listingName.trim(),
          declaredVariety: variety,
          customVariety: variety === 'Others' ? customVariety : undefined,
          varietyCode,
          // Empty string clears specific-variety columns when leaving Inbred/Hybrid
          // (RPC treats null+null as "leave unchanged").
          specificVarietyName: needsSpecificVariety ? specificVariety?.value ?? null : '',
          specificVarietyNameCustom:
            specificVariety?.value === SPECIFIC_VARIETY_OTHER ? specificVarietyCustom : undefined,
          declaredMoisture: moistureType,
          declaredPurityGrade: purityGrade,
          grossWeightKg: parseFloat(grossWeight) || 0,
          tareWeightKg: parseFloat(tareWeight) || 0,
          remainingQuantityKg: remaining,
        });
      }

      const slotsToUpload = [...dirtyPhotoSlots];
      if (slotsToUpload.length > 0) {
        const results = await Promise.allSettled(
          slotsToUpload.map((slot) => uploadListingPhoto(id, slot, photos[slot]!)),
        );
        const failed = slotsToUpload.filter((_, i) => results[i].status === 'rejected');
        if (failed.length > 0) {
          setErrorMessage(
            isTagalog
              ? `Hindi na-upload ang ${failed.length} larawan. Subukan muli.`
              : `Failed to upload ${failed.length} photo(s). Try again.`,
          );
          return;
        }
      }

      router.replace({ pathname: '/(farmer)/listing-detail', params: { id } });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : (isTagalog ? 'Hindi na-save ang pagbabago.' : 'Failed to save changes.'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = t('wizV2.editTitle');

  if (loading) {
    return (
      <View style={styles.screen}>
        <V2BackHeader title={title} backLabel={t('wizV2.back')} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.screen}>
        <V2BackHeader title={title} backLabel={t('wizV2.back')} onBack={() => router.back()} />
        <View style={styles.center}>
          <InlineError message={loadError} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.select({ ios: 'padding', default: 'height' })}>
      <V2BackHeader title={title} backLabel={t('wizV2.back')} onBack={() => router.back()} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {cosmeticOnly ? (
          <DepthCard
            depth="flat"
            radius="lg"
            backgroundColor={AnimoV2Colors.warningBg}
            borderColor={AnimoV2Colors.warningSolid}
            style={styles.noteCard}>
            <IconTile icon={Lock} tone="warning" size={36} />
            <AnimoText variant="captionV2" color={AnimoV2Colors.textPrimary} style={{ flex: 1 }}>
              {t('wizV2.editLocked')}
            </AnimoText>
          </DepthCard>
        ) : null}

        <View style={styles.section}>
          <AnimoText variant="subheading">{t('wizV2.photosTitle')}</AnimoText>
          <PhotoSlotGrid
            photos={photos}
            onPressSlot={setActiveSlot}
            canClear={(slot) => dirtyPhotoSlots.has(slot)}
            onClear={handleClearPhoto}
          />
        </View>

        <View style={styles.section}>
          <AnimoText variant="subheading">{t('wizV2.detailsTitle')}</AnimoText>
          <TextField
            label={t('wizV2.nameLabel')}
            value={listingName}
            onChangeText={setListingName}
            placeholder={t('wizV2.namePh')}
          />
          <View
            pointerEvents={cosmeticOnly ? 'none' : 'auto'}
            style={[{ gap: AnimoV2Spacing.xl }, cosmeticOnly ? styles.locked : undefined]}>
            <VarietyFields
              variety={variety}
              onVarietyChange={(next) => {
                setVariety(next);
                setCustomVariety('');
                setSpecificVariety(null);
                setSpecificVarietyCustom('');
              }}
              customVariety={customVariety}
              onCustomVarietyChange={setCustomVariety}
              specificOptions={specificVarietyOptions}
              specificVariety={specificVariety}
              onSpecificSelect={(option) => {
                setSpecificVariety(option);
                if (option.value !== SPECIFIC_VARIETY_OTHER) {
                  setSpecificVarietyCustom('');
                }
              }}
              specificCustom={specificVarietyCustom}
              onSpecificCustomChange={setSpecificVarietyCustom}
              editable={!cosmeticOnly}
            />
            <MoistureGradeFields
              moisture={moistureType}
              onMoistureChange={setMoistureType}
              grade={purityGrade}
              onGradeChange={setPurityGrade}
            />
          </View>
        </View>

        <View
          pointerEvents={cosmeticOnly ? 'none' : 'auto'}
          style={[styles.section, cosmeticOnly ? styles.locked : undefined]}>
          <AnimoText variant="subheading">{t('wizV2.weightTitle')}</AnimoText>
          <WeightFields
            gross={grossWeight}
            tare={tareWeight}
            onGrossChange={setGrossWeight}
            onTareChange={setTareWeight}
            net={netWeight}
            editable={!cosmeticOnly}
          />
        </View>

        {errorMessage ? <InlineError message={errorMessage} /> : null}
      </ScrollView>

      <StickyFooter>
        <ChunkyButton
          label={t('wizV2.editSave')}
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />
        <View style={{ height: insets.bottom }} />
      </StickyFooter>

      <PhotoSourceSheetV2
        visible={activeSlot !== null}
        onPickCamera={() => handlePickSource('camera')}
        onPickGallery={() => handlePickSource('gallery')}
        onClose={() => setActiveSlot(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: AnimoV2Spacing.lg },
  scrollContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.xl,
  },
  section: { gap: AnimoV2Spacing.lg },
  noteCard: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md, padding: AnimoV2Spacing.md },
  locked: { opacity: 0.55 },
});
