import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Phone half of push delivery. The server half (user.expo_push_token, the
 * queue, the triggers, send-push-notifications) is in migrations 0030 and
 * 0032. Registration never blocks sign-in: every failure path returns null.
 * Push does not exist on web (the notifications module has no web handler), so
 * the browser preview skips all of it.
 */

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const ANDROID_CHANNEL_ID = 'default';

type TokenClient = Pick<typeof supabase, 'from'>;

function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Asks for permission, fetches the Expo token, and saves it on the caller's
 * own user row when it differs from what is stored. Returns the token, or
 * null on an emulator, a denied permission, or any failure.
 */
export async function registerPushToken(
  userId: string,
  client: TokenClient = supabase,
): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Animo',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = easProjectId();
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { data: row } = await client
      .from('user')
      .select('expo_push_token')
      .eq('user_id', userId)
      .maybeSingle();
    if (row?.expo_push_token === token) return token;

    const { error } = await client
      .from('user')
      .update({ expo_push_token: token })
      .eq('user_id', userId);
    if (error) return null;

    return token;
  } catch {
    return null;
  }
}

/** Removes the stored token so the next person on this phone is not sent the previous user's notices. */
export async function clearPushToken(userId: string, client: TokenClient = supabase): Promise<void> {
  try {
    await client.from('user').update({ expo_push_token: null }).eq('user_id', userId);
  } catch {
    // Signing out must not fail because the token could not be cleared.
  }
}
