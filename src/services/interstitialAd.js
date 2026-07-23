import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, {
  AdEventType,
  AdsConsent,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from "react-native-google-mobile-ads";

const COMPLETION_COUNT_STORAGE_KEY = "@lang:completed-sets-for-ads";
const COMPLETIONS_BETWEEN_ADS = 2;
const INTERSTITIAL_LOAD_WAIT_MS = 4000;
const configuredInterstitialId =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID?.trim();
const interstitialId = configuredInterstitialId || TestIds.INTERSTITIAL;

let initializationPromise = null;
let interstitial = null;
let isInterstitialLoaded = false;
let pendingShowResolver = null;

export function initializeAds() {
  if (!initializationPromise) {
    initializationPromise = initializeAdsOnce().catch((error) => {
      console.warn("[ads] Não foi possível inicializar os anúncios:", error);
      return false;
    });
  }

  return initializationPromise;
}

export async function showCompletionInterstitial() {
  const shouldShow = await shouldShowAdForThisCompletion();

  if (!shouldShow) {
    return false;
  }

  const initialized = await initializeAds();

  if (!initialized) {
    return false;
  }

  const isLoaded = await waitForInterstitialLoad();

  if (!isLoaded || !interstitial) {
    console.info("[ads] Intersticial indisponível; continuando sem anúncio.");
    return false;
  }

  return new Promise((resolve) => {
    pendingShowResolver = resolve;
    isInterstitialLoaded = false;

    interstitial.show().catch((error) => {
      console.warn("[ads] Não foi possível exibir o intersticial:", error);
      finishPendingShow(false);
      prepareInterstitial();
    });
  });
}

async function initializeAdsOnce() {
  const consentInfo = await AdsConsent.gatherConsent();

  if (!consentInfo.canRequestAds) {
    console.info("[ads] Consentimento ainda não permite solicitar anúncios.");
    return false;
  }

  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    testDeviceIdentifiers: ["EMULATOR"],
  });
  await mobileAds().initialize();
  prepareInterstitial();

  return true;
}

function prepareInterstitial() {
  interstitial?.removeAllListeners();
  isInterstitialLoaded = false;
  interstitial = InterstitialAd.createForAdRequest(interstitialId);

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isInterstitialLoaded = true;
    console.info("[ads] Intersticial carregado.");
  });
  interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
    isInterstitialLoaded = false;
    console.warn("[ads] Falha ao carregar o intersticial:", error);
    finishPendingShow(false);
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    finishPendingShow(true);
    prepareInterstitial();
  });
  interstitial.load();
}

async function shouldShowAdForThisCompletion() {
  try {
    const storedCount = Number(
      await AsyncStorage.getItem(COMPLETION_COUNT_STORAGE_KEY)
    );
    const nextCount = Number.isFinite(storedCount) ? storedCount + 1 : 1;

    await AsyncStorage.setItem(
      COMPLETION_COUNT_STORAGE_KEY,
      String(nextCount)
    );

    if (__DEV__) {
      return true;
    }

    return nextCount % COMPLETIONS_BETWEEN_ADS === 0;
  } catch (error) {
    console.warn("[ads] Não foi possível atualizar a frequência:", error);
    return false;
  }
}

function waitForInterstitialLoad() {
  if (isInterstitialLoaded) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      if (isInterstitialLoaded) {
        clearInterval(intervalId);
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= INTERSTITIAL_LOAD_WAIT_MS) {
        clearInterval(intervalId);
        resolve(false);
      }
    }, 100);
  });
}

function finishPendingShow(wasShown) {
  const resolve = pendingShowResolver;
  pendingShowResolver = null;
  resolve?.(wasShown);
}
