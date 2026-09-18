import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { LabeledInput } from '@/components/animo/labeled-input';
import { PhotoSourceSheet } from '@/components/animo/photo-source-sheet';
import { SelectField } from '@/components/animo/select-field';
import { SpecificVarietyField } from '@/components/animo/specific-variety-field';
import { SegmentedChoice } from '@/components/animo/segmented-choice';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  fetchCropListing,
  fetchListingPhotos,
  listingHasActiveDeal,
  updateCropListing,
  uploadListingPhoto,
} from '@/services/crop-listing-service';
import {
  HYBRID_SPECIFIC_VARIETY_OPTIONS,
  INBRED_SPECIFIC_VARIETY_OPTIONS,
  MOISTURE_OPTIONS,
  PHOTO_SLOTS,
  PURITY_OPTIONS,
  SPECIFIC_VARIETY_OTHER,
  VARIETY_OPTIONS,
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
): SpecificVarietyOption | null {
  if (!name || (variety !== 'Inbred' && variety !== 'Hybrid')) return null;
  const options =
    variety === 'Inbred' ? INBRED_SPECIFIC_VARIETY_OPTIONS : HYBRID_SPECIFIC_VARIETY_OPTIONS;
  const found = options.find((o) => o.value === name);
  if (found) return found;
  if (name === SPECIFIC_VARIETY_OTHER) {
    return { value: SPECIFIC_VARIETY_OTHER, label: 'Iba pa', varietyCode: 'OTHER' };
  }
  return null;
}

/** Edit an existing listing — same fields as create; locks non-cosmetic when an active deal exists. */
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [cosmeticOnly, setCosmeticOnly] = useState(false);
  const [originalNet, setOriginalNet] = useState(0);
  const [originalRemaining, setOriginalRemaining] = useState(0);

  const [variety, setVariety] = useState<DeclaredVariety | ''>('');
  const [listingName, setListingName] = useState('');
  const [customVariety, setCustomVariety] = useState('');
  const [specificVariety, setSpecificVariety] = useState<SpecificVarietyOption | null>(null);
  const [specificVarietyOpen, setSpecificVarietyOpen] = useState(false);
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
          setLoadError('Hindi nahanap ang listing.');
          return;
        }
        if (listing.status === 'Archived') {
          setLoadError('Hindi na maaaring i-edit ang naka-archive na listing.');
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
          setLoadError(err instanceof Error ? err.message : 'Hindi ma-load ang listing.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const netWeight = Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0));
  const needsSpecificVariety = variety === 'Inbred' || variety === 'Hybrid';
  const specificVarietyOptions =
    variety === 'Inbred'
      ? INBRED_SPECIFIC_VARIETY_OPTIONS
      : variety === 'Hybrid'
        ? HYBRID_SPECIFIC_VARIETY_OPTIONS
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
          ? 'Kailangan ng pahintulot para makakuha ng larawan.'
          : 'Kailangan ng pahintulot. Buksan ang Settings ng telepono para payagan ang ANIMO.',
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
      setErrorMessage('Hindi maproseso ang larawan. Subukan muli.');
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
          setErrorMessage(`Hindi na-upload ang ${failed.length} larawan. Subukan muli.`);
          return;
        }
      }

      router.replace({ pathname: '/(farmer)/listing-detail', params: { id } });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Hindi na-save ang pagbabago.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title="I-edit ang Listing" />
        <View style={styles.center}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title="I-edit ang Listing" />
        <View style={styles.center}>
          <AnimoText variant="body" color={AnimoColors.danger}>
            {loadError}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BackHeader title="I-edit ang Listing" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cosmeticOnly ? (
          <View style={[styles.card, styles.shadow]}>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
              May aktibong request o transaksyon ang listing na ito. Maaari mo lang baguhin ang
              pangalan at mga larawan; presyo, dami, uri, moisture, at kalinisan ay naka-lock.
            </AnimoText>
          </View>
        ) : null}

        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            Mga Larawan ng Palay
          </AnimoText>
          <View style={styles.photoRow}>
            {PHOTO_SLOTS.map((slot) => {
              const localUri = photos[slot.value];
              return (
                <Pressable
                  key={slot.value}
                  accessibilityRole="button"
                  onPress={() => setActiveSlot(slot.value)}
                  style={styles.photoTile}>
                  {localUri ? (
                    <>
                      <Image source={{ uri: localUri }} style={styles.photoTileImage} contentFit="cover" />
                      {dirtyPhotoSlots.has(slot.value) ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => handleClearPhoto(slot.value)}
                          style={styles.photoTileClear}
                          hitSlop={8}>
                          <X size={12} color={AnimoColors.textHighEmphasisInverse} />
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.photoTileIconWrap}>
                      <Camera size={20} color={AnimoColors.accentPrimary} />
                    </View>
                  )}
                  <AnimoText
                    variant="tag"
                    color={AnimoColors.textMediumEmphasis}
                    style={styles.photoTileLabel}>
                    {slot.label}
                  </AnimoText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.shadow]}>
          <LabeledInput
            label="Pangalan ng Listing"
            value={listingName}
            onChangeText={setListingName}
            placeholder="Hal. Palay Listing"
          />

          <View pointerEvents={cosmeticOnly ? 'none' : 'auto'} style={cosmeticOnly ? styles.locked : undefined}>
            <View style={styles.inlineFieldSpacing}>
              <SelectField
                label="Uri ng Palay"
                placeholder="Pumili ng uri ng palay"
                options={VARIETY_OPTIONS}
                value={variety || null}
                onChange={(value) => {
                  const next = value as DeclaredVariety;
                  setVariety(next);
                  setCustomVariety('');
                  setSpecificVariety(null);
                  setSpecificVarietyCustom('');
                  setSpecificVarietyOpen(next === 'Inbred' || next === 'Hybrid');
                }}
              />
            </View>
            {variety === 'Others' ? (
              <View style={styles.inlineFieldSpacing}>
                <LabeledInput
                  value={customVariety}
                  onChangeText={setCustomVariety}
                  placeholder="Ilagay ang pangalan ng uri"
                  editable={!cosmeticOnly}
                />
              </View>
            ) : null}
            {needsSpecificVariety ? (
              <View style={styles.inlineFieldSpacing}>
                <SpecificVarietyField
                  label="Tiyak na Uri ng Palay"
                  placeholder="Pumili ng tiyak na uri"
                  options={specificVarietyOptions}
                  value={specificVariety?.value ?? null}
                  open={cosmeticOnly ? false : specificVarietyOpen}
                  onOpenChange={setSpecificVarietyOpen}
                  onSelect={(option) => {
                    setSpecificVariety(option);
                    if (option.value !== SPECIFIC_VARIETY_OTHER) {
                      setSpecificVarietyCustom('');
                    }
                  }}
                />
                {specificVariety?.value === SPECIFIC_VARIETY_OTHER ? (
                  <View style={styles.inlineFieldSpacing}>
                    <LabeledInput
                      value={specificVarietyCustom}
                      onChangeText={setSpecificVarietyCustom}
                      placeholder="Ilagay ang tiyak na uri"
                      editable={!cosmeticOnly}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            <SegmentedChoice
              label="Moisture %"
              options={MOISTURE_OPTIONS}
              value={moistureType}
              onChange={setMoistureType}
            />

            <SelectField
              label="Kalinisan (Purity Grade)"
              placeholder="Pumili ng kalinisan ng palay"
              options={PURITY_OPTIONS}
              value={purityGrade || null}
              onChange={(value) => setPurityGrade(value as PurityGrade)}
            />
          </View>
        </View>

        <View
          pointerEvents={cosmeticOnly ? 'none' : 'auto'}
          style={[styles.card, styles.shadow, cosmeticOnly ? styles.locked : undefined]}>
          <LabeledInput
            label="Timbang ng Palay (Gross Weight)"
            value={grossWeight}
            onChangeText={setGrossWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText="kilo/kg"
            editable={!cosmeticOnly}
          />
          <LabeledInput
            label="Timbang ng Sako at iba pa (Tare Weight)"
            value={tareWeight}
            onChangeText={setTareWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText="kilo/kg"
            editable={!cosmeticOnly}
          />
          <View>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
              Kabuuan (Net Weight)
            </AnimoText>
            <View style={styles.netWeightField}>
              <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
                {netWeight}
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
                kilo/kg
              </AnimoText>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <AnimoText variant="body" color={AnimoColors.danger}>
            {errorMessage}
          </AnimoText>
        ) : null}

        <AnimoButton
          label="I-save"
          variant="primary"
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />
      </ScrollView>

      <PhotoSourceSheet
        visible={activeSlot !== null}
        onPickCamera={() => handlePickSource('camera')}
        onPickGallery={() => handlePickSource('gallery')}
        onClose={() => setActiveSlot(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AnimoSpacing.lg,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.xl,
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.xl,
  },
  locked: {
    opacity: 0.55,
  },
  inlineFieldSpacing: {
    marginTop: AnimoSpacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  photoTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1.5,
    borderColor: AnimoColors.accentPrimary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  photoTileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoTileClear: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTileIconWrap: {
    marginBottom: AnimoSpacing.xs,
  },
  photoTileLabel: {
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  netWeightField: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
  },
});
