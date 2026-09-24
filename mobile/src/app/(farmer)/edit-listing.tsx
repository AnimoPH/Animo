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
  getMoistureOptions,
  getPhotoSlots,
  getPurityOptions,
  getVarietyOptions,
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
  const { language, isTagalog } = useLanguage();
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

  const photoSlots = getPhotoSlots(language);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title={isTagalog ? 'I-edit ang Listing' : 'Edit Listing'} />
        <View style={styles.center}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title={isTagalog ? 'I-edit ang Listing' : 'Edit Listing'} />
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
      <BackHeader title={isTagalog ? 'I-edit ang Listing' : 'Edit Listing'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cosmeticOnly ? (
          <View style={[styles.card, styles.shadow]}>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
              {isTagalog
                ? 'May aktibong request o transaksyon ang listing na ito. Maaari mo lang baguhin ang pangalan at mga larawan; presyo, dami, uri, moisture, at kalinisan ay naka-lock.'
                : 'This listing has active requests or deals. Only the title and photos can be edited; price, weight, variety, moisture, and purity grade are locked.'}
            </AnimoText>
          </View>
        ) : null}

        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? 'Mga Larawan ng Palay' : 'Harvest Photos'}
          </AnimoText>
          <View style={styles.photoRow}>
            {photoSlots.map((slot) => {
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
            label={isTagalog ? 'Pangalan ng Listing' : 'Listing Name'}
            value={listingName}
            onChangeText={setListingName}
            placeholder={isTagalog ? 'Hal. Palay Listing' : 'e.g. Palay Listing'}
          />

          <View pointerEvents={cosmeticOnly ? 'none' : 'auto'} style={cosmeticOnly ? styles.locked : undefined}>
            <View style={styles.inlineFieldSpacing}>
              <SelectField
                label={isTagalog ? 'Uri ng Palay' : 'Rice Variety'}
                placeholder={isTagalog ? 'Pumili ng uri ng palay' : 'Select rice variety'}
                options={getVarietyOptions(language)}
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
                  placeholder={isTagalog ? 'Ilagay ang pangalan ng uri' : 'Enter variety name'}
                  editable={!cosmeticOnly}
                />
              </View>
            ) : null}
            {needsSpecificVariety ? (
              <View style={styles.inlineFieldSpacing}>
                <SpecificVarietyField
                  label={isTagalog ? 'Tiyak na Uri ng Palay' : 'Specific Rice Variety'}
                  placeholder={isTagalog ? 'Pumili ng tiyak na uri' : 'Select specific variety'}
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
                      placeholder={isTagalog ? 'Ilagay ang tiyak na uri' : 'Enter specific variety'}
                      editable={!cosmeticOnly}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            <SegmentedChoice
              label="Moisture %"
              options={getMoistureOptions(language)}
              value={moistureType}
              onChange={setMoistureType}
            />

            <SelectField
              label={isTagalog ? 'Kalinisan (Purity Grade)' : 'Purity Grade'}
              placeholder={isTagalog ? 'Pumili ng kalinisan ng palay' : 'Select purity grade'}
              options={getPurityOptions(language)}
              value={purityGrade || null}
              onChange={(value) => setPurityGrade(value as PurityGrade)}
            />
          </View>
        </View>

        <View
          pointerEvents={cosmeticOnly ? 'none' : 'auto'}
          style={[styles.card, styles.shadow, cosmeticOnly ? styles.locked : undefined]}>
          <LabeledInput
            label={isTagalog ? 'Timbang ng Palay (Gross Weight)' : 'Gross Weight'}
            value={grossWeight}
            onChangeText={setGrossWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText={isTagalog ? 'kilo/kg' : 'kg'}
            editable={!cosmeticOnly}
          />
          <LabeledInput
            label={isTagalog ? 'Timbang ng Sako at iba pa (Tare Weight)' : 'Tare Weight (Sacks & deductibles)'}
            value={tareWeight}
            onChangeText={setTareWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText={isTagalog ? 'kilo/kg' : 'kg'}
            editable={!cosmeticOnly}
          />
          <View>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
              {isTagalog ? 'Kabuuan (Net Weight)' : 'Net Weight'}
            </AnimoText>
            <View style={styles.netWeightField}>
              <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
                {netWeight}
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
                {isTagalog ? 'kilo/kg' : 'kg'}
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
          label={isTagalog ? 'I-save' : 'Save Changes'}
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
