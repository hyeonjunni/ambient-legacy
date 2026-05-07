import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as ImagePicker from "expo-image-picker";

const uploadTypes = [
  {
    key: "voice",
    label: "음성",
    icon: "VO",
    color: "#2563EB",
    tint: "#DBEAFE",
    description: "대화, 조언, 레시피, 가족 인터뷰 음성 기록을 저장합니다.",
  },
  {
    key: "text",
    label: "텍스트",
    icon: "TX",
    color: "#0F766E",
    tint: "#CCFBF1",
    description: "메모, 편지, 일정, 생활 정보 같은 텍스트 기록을 남깁니다.",
  },
  {
    key: "image",
    label: "이미지",
    icon: "IMG",
    color: "#EA580C",
    tint: "#FFEDD5",
    description: "가족 사진, 문서 이미지, 장소 기록을 디바이스에서 업로드합니다.",
  },
  {
    key: "video",
    label: "영상",
    icon: "VID",
    color: "#7C3AED",
    tint: "#EDE9FE",
    description: "인터뷰, 행사 영상, 일상 장면을 디바이스에서 업로드합니다.",
  },
];

const initialItems = [
  {
    id: "seed-1",
    type: "text",
    title: "엄마의 김치찌개 메모",
    detail: "돼지고기는 먼저 볶고, 김치는 오래 익히기",
    createdAt: "2026.04.10",
  },
  {
    id: "seed-2",
    type: "image",
    title: "제주도 가족여행 사진",
    detail: "2018년 여름 / 성산일출봉",
    createdAt: "2026.04.10",
  },
];

const tabItems = [
  { key: "home", label: "\ud648" },
  { key: "chat", label: "\ucc57\ubd07" },
  { key: "storage", label: "\uc800\uc7a5\uc18c" },
  { key: "mypage", label: "\ub9c8\uc774" },
];

const modelOptions = [
  {
    id: "gemma-4-e2b-device",
    label: "Gemma 4 E2B",
    placement: "device",
    summary: "Android 온디바이스 기본 모델로 가정한 경량 프로필",
  },
  {
    id: "gemma-4-e4b-device",
    label: "Gemma 4 E4B",
    placement: "device",
    summary: "고사양 기기에서 더 높은 품질을 기대하는 프로필",
  },
  {
    id: "exaone-family-vault",
    label: "EXAONE Family Vault",
    placement: "family_vault",
    summary: "가족 금고 노드의 정본 응답을 담당하는 메인 모델",
  },
];

const personaOptions = [
  {
    id: "father-calm",
    label: "아버지 페르소나",
    tone: "차분하고 핵심만 짚는 조언형",
  },
  {
    id: "mother-warm",
    label: "어머니 페르소나",
    tone: "정서적 공감과 생활 맥락을 살리는 대화형",
  },
  {
    id: "grandfather-mentor",
    label: "할아버지 페르소나",
    tone: "회고와 조언이 섞인 회상형",
  },
];

const demoQuestionOptions = [
  "할아버지가 예전에 하셨던 조언을 요약해줘.",
  "송년회에서 어떤 말을 했는지 기억나?",
  "부산 여행 때 남긴 가족 기록을 정리해줘.",
];

const STORAGE_KEYS = {
  records: "ambient.records",
  familyRooms: "ambient.familyRooms",
  activeFamilyId: "ambient.activeFamilyId",
  user: "ambient.user",
  apiBaseUrl: "ambient.apiBaseUrl",
  selectedModelId: "ambient.selectedModelId",
  selectedPersonaId: "ambient.selectedPersonaId",
};

const GOOGLE_WEB_CLIENT_ID = "279745599452-9tlm7fg2mndf6jk8nqo05cclh3hq0r9u.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "279745599452-pgln185p4sc73bdrj8vv7ptk42j4nemp.apps.googleusercontent.com";
const DEFAULT_API_BASE_URL = "http://172.30.1.5:8000/api/v1";
let runtimeApiBaseUrl = DEFAULT_API_BASE_URL;

function normalizeApiBaseUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const withoutTrailingSlash = withProtocol.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api/v1`;
}

function setRuntimeApiBaseUrl(nextValue) {
  runtimeApiBaseUrl = normalizeApiBaseUrl(nextValue);
  return runtimeApiBaseUrl;
}

function getRuntimeApiBaseUrl() {
  return runtimeApiBaseUrl;
}

function buildApiUrl(path, baseUrl = null) {
  const resolvedBaseUrl = baseUrl || getRuntimeApiBaseUrl();
  return `${resolvedBaseUrl}${path}`;
}
function getNetworkGuidanceMessage() {
  return `같은 Wi-Fi에 연결된 상태에서, 앱 안의 서버 주소를 현재 PC의 로컬 IP로 맞춰야 합니다. 현재 설정: ${getRuntimeApiBaseUrl()}`;
}

function getReadableErrorMessage(error, fallbackMessage) {
  if (error?.message?.includes("Network request failed")) {
    return `${fallbackMessage}\\n\\n${getNetworkGuidanceMessage()}`;
  }

  if (Array.isArray(error)) {
    return error.map((item) => getReadableErrorMessage(item, fallbackMessage)).join("\n");
  }

  if (error && typeof error === "object" && !error.message) {
    try {
      return JSON.stringify(error, null, 2);
    } catch (_error) {
      return fallbackMessage;
    }
  }

  return error?.message || fallbackMessage;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(buildApiUrl(path, options.baseUrl || null), {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch (_error) {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    const detail =
      responseData && typeof responseData === "object"
        ? responseData.detail || responseData.message
        : null;

    throw new Error(detail || `\uc694\uccad\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. (${response.status})`);
  }

  return responseData;
}

async function syncUserToBackend(payload) {
  return apiRequest("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function loginDemoUserToBackend() {
  return apiRequest("/auth/demo", {
    method: "POST",
  });
}

function buildFallbackEmail(identityValue) {
  const normalized = String(identityValue || "user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "user"}@ambientlegacy.app`;
}

async function fetchFamilyMembers(roomId) {
  return apiRequest(`/families/${roomId}/members`);
}

async function fetchUserFamilies(userId) {
  return apiRequest(`/families?user_id=${encodeURIComponent(userId)}`);
}

async function deleteFamily(roomId, userId) {
  return apiRequest(`/families/${roomId}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

async function updateUserProfile(userId, payload) {
  return apiRequest(`/auth/profile/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function checkBackendHealth(baseUrlOverride = null) {
  return apiRequest("/system/health/db", baseUrlOverride ? { baseUrl: normalizeApiBaseUrl(baseUrlOverride) } : {});
}

async function fetchUploads(roomId, userId) {
  return apiRequest(`/uploads/${roomId}?user_id=${encodeURIComponent(userId)}`);
}

async function createUploadEntry(payload) {
  return apiRequest("/uploads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function fetchAIDemoChat(payload) {
  return apiRequest("/ai/chat-demo", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function bootstrapAIDemo(payload) {
  return apiRequest("/ai/demo-bootstrap", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function fetchAIModels() {
  return apiRequest("/ai/models");
}

async function fetchAIPersonas() {
  return apiRequest("/ai/personas");
}

async function uploadMediaBinary(uploadId, userId, asset) {
  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}`,
    type: asset.mimeType || "application/octet-stream",
  });

  const response = await fetch(
    buildApiUrl(`/uploads/${uploadId}/binary?user_id=${encodeURIComponent(userId)}`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    }
  );

  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch (_error) {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    const detail =
      responseData && typeof responseData === "object"
        ? responseData.detail || responseData.message
        : null;
    throw new Error(detail || `?? ???? ??????. (${response.status})`);
  }

  return responseData;
}

function formatRecordDate(value) {
  if (!value) {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10).replace(/-/g, ".") || value;
  }

  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")}`;
}

function mapUploadToRecord(upload) {
  return {
    id: upload.upload_id,
    type: upload.type,
    title: upload.title,
    detail: upload.description || "?? ?? ??",
    createdAt: formatRecordDate(upload.created_at),
    fileUrl: upload.file_url || null,
    mimeType: upload.mime_type || null,
    hasFile: Boolean(upload.has_file),
  };
}

function mapFamilyRoom(room, members, currentUserId) {
  return {
    id: room.room_id,
    name: room.name,
    code: room.invite_code,
    role: room.owner_user_id === currentUserId ? "\ubc29\uc7a5" : "\uac00\uc871 \uad6c\uc131\uc6d0",
    members: Array.isArray(members) ? members : [],
    createdAt: new Date().toLocaleDateString("ko-KR"),
  };
}

function buildProfileDraft(user) {
  return {
    name: user?.name || "",
    age: user?.age ? String(user.age) : "",
    gender: user?.gender || "",
    phone: user?.phone || "",
    email: user?.email || "",
  };
}

function isProfileComplete(user) {
  return Boolean(user?.name && user?.age && user?.gender && user?.phone && user?.email);
}

function isProfileFormComplete(draft) {
  const normalizedAge = draft?.age?.trim() ? Number.parseInt(draft.age.trim(), 10) : null;

  return Boolean(
    draft?.name?.trim() &&
      Number.isFinite(normalizedAge) &&
      normalizedAge > 0 &&
      draft?.gender?.trim() &&
      draft?.phone?.trim() &&
      draft?.email?.trim()
  );
}

function getRoleLabel(role) {
  return role === "owner" ? "\ubc29\uc7a5" : "\uad6c\uc131\uc6d0";
}

function isGoogleAuthConfigured() {
  const clientId = GOOGLE_WEB_CLIENT_ID.trim();

  return Boolean(
    clientId &&
      clientId !== "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com" &&
      clientId.endsWith(".apps.googleusercontent.com")
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [records, setRecords] = useState(initialItems);
  const [selectedType, setSelectedType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [familyRooms, setFamilyRooms] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [user, setUser] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(getRuntimeApiBaseUrl());
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileDraft, setProfileDraft] = useState(buildProfileDraft(null));
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState(modelOptions);
  const [availablePersonas, setAvailablePersonas] = useState(personaOptions);
  const [selectedModelId, setSelectedModelId] = useState(modelOptions[0].id);
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaOptions[0].id);
  const latestUserRef = useRef(null);
  const googleAuthReady = isGoogleAuthConfigured();

  const groupedRecords = useMemo(() => {
    return uploadTypes.map((type) => ({
      ...type,
      items: records.filter((record) => record.type === type.key),
    }));
  }, [records]);

  const activeFamily = useMemo(() => {
    return familyRooms.find((room) => room.id === activeFamilyId) || null;
  }, [familyRooms, activeFamilyId]);

  const selectedModel = useMemo(() => {
    return availableModels.find((item) => item.id === selectedModelId) || availableModels[0] || modelOptions[0];
  }, [availableModels, selectedModelId]);

  const selectedPersona = useMemo(() => {
    return availablePersonas.find((item) => item.id === selectedPersonaId) || availablePersonas[0] || personaOptions[0];
  }, [availablePersonas, selectedPersonaId]);

  useEffect(() => {
    async function loadPersistedData() {
      try {
        const [savedUser, savedApiBaseUrl, savedModelId, savedPersonaId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.user),
          AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
          AsyncStorage.getItem(STORAGE_KEYS.selectedModelId),
          AsyncStorage.getItem(STORAGE_KEYS.selectedPersonaId),
        ]);

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        if (savedApiBaseUrl) {
          const normalizedApiBaseUrl = setRuntimeApiBaseUrl(savedApiBaseUrl);
          setApiBaseUrl(normalizedApiBaseUrl);
        } else {
          setApiBaseUrl(setRuntimeApiBaseUrl(DEFAULT_API_BASE_URL));
        }
        if (savedModelId && modelOptions.some((item) => item.id === savedModelId)) {
          setSelectedModelId(savedModelId);
        }
        if (savedPersonaId && personaOptions.some((item) => item.id === savedPersonaId)) {
          setSelectedPersonaId(savedPersonaId);
        }
      } catch (_error) {
        Alert.alert("\uc800\uc7a5\ub41c \ub370\uc774\ud130 \ub85c\ub4dc \uc2e4\ud328", "\ub85c\uceec\uc5d0 \uc800\uc7a5\ub41c \ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
      } finally {
        setStorageLoaded(true);
      }
    }

    loadPersistedData();
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (user) {
      AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [user, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    const normalizedApiBaseUrl = setRuntimeApiBaseUrl(apiBaseUrl);
    if (normalizedApiBaseUrl !== apiBaseUrl) {
      setApiBaseUrl(normalizedApiBaseUrl);
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.apiBaseUrl, normalizedApiBaseUrl);
  }, [apiBaseUrl, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded || !user?.id) {
      return;
    }

    let cancelled = false;

    async function syncAIOptions() {
      try {
        const [models, personas] = await Promise.all([fetchAIModels(), fetchAIPersonas()]);
        if (cancelled) {
          return;
        }

        if (Array.isArray(models) && models.length > 0) {
          const normalizedModels = models.map((item) => ({
            id: item.id,
            label: item.display_name,
            placement: item.placement,
            summary: item.notes,
            provider: item.provider,
          }));
          setAvailableModels(normalizedModels);
          setSelectedModelId((prev) => (
            normalizedModels.some((item) => item.id === prev) ? prev : normalizedModels[0].id
          ));
        }

        if (Array.isArray(personas) && personas.length > 0) {
          const normalizedPersonas = personas.map((item) => ({
            id: item.id,
            label: item.label,
            tone: item.tone,
          }));
          setAvailablePersonas(normalizedPersonas);
          setSelectedPersonaId((prev) => (
            normalizedPersonas.some((item) => item.id === prev) ? prev : normalizedPersonas[0].id
          ));
        }
      } catch (_error) {
      }
    }

    syncAIOptions();

    return () => {
      cancelled = true;
    };
  }, [storageLoaded, user?.id]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.selectedModelId, selectedModelId);
  }, [selectedModelId, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.selectedPersonaId, selectedPersonaId);
  }, [selectedPersonaId, storageLoaded]);

  useEffect(() => {
    if (!googleAuthReady) {
      return;
    }

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      scopes: ["profile", "email"],
    });
  }, [googleAuthReady]);

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (!user) {
      setFamilyRooms([]);
      setActiveFamilyId(null);
      return;
    }

    let cancelled = false;

    async function syncFamiliesForCurrentUser() {
      try {
        const ensuredUser = await ensureBackendUser(user, { force: true });
        const rooms = await fetchUserFamilies(ensuredUser.id);
        const hydratedRooms = await Promise.all(
          rooms.map(async (room) => {
            const members = await fetchFamilyMembers(room.room_id);
            return mapFamilyRoom(room, members, ensuredUser.id);
          })
        );

        if (cancelled) {
          return;
        }

        setFamilyRooms(hydratedRooms);
        setActiveFamilyId((prev) => {
          if (prev && hydratedRooms.some((room) => room.id === prev)) {
            return prev;
          }

          return hydratedRooms[0]?.id || null;
        });
      } catch (_error) {
      }
    }

    syncFamiliesForCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [user?.id, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (user && !isProfileComplete(user)) {
      setProfileDraft(buildProfileDraft(user));
      setProfileModalVisible(true);
      return;
    }

    setProfileModalVisible(false);
  }, [user, storageLoaded]);

  useEffect(() => {
    if (activeTab !== "mypage" || !user || familyRooms.length === 0) {
      return;
    }

    const syncRooms = async () => {
      try {
        await refreshFamilyRoomsFromBackend();
      } catch (_error) {
      }
    };

    syncRooms();
    const intervalId = setInterval(syncRooms, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeTab, user, familyRooms.length]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (!user || !activeFamilyId) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    setRecords([]);

    async function syncUploadsForActiveFamily() {
      try {
        const ensuredUser = await ensureBackendUser(user, { force: true });
        const uploads = await fetchUploads(activeFamilyId, ensuredUser.id);
        if (cancelled) {
          return;
        }
        setRecords(uploads.map(mapUploadToRecord));
      } catch (_error) {
        if (!cancelled) {
          setRecords([]);
        }
      }
    }

    syncUploadsForActiveFamily();

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeFamilyId, storageLoaded]);

  function upsertFamilyRoom(nextRoom) {
    setFamilyRooms((prev) => [nextRoom, ...prev.filter((room) => room.id !== nextRoom.id)]);
  }

  async function refreshFamilyRoomsFromBackend() {
    if (!user) {
      return;
    }

    const ensuredUser = await ensureBackendUser(user, { force: true });
    const rooms = await fetchUserFamilies(ensuredUser.id);
    const refreshedRooms = await Promise.all(
      rooms.map(async (room) => {
        const members = await fetchFamilyMembers(room.room_id);
        return mapFamilyRoom(room, members, ensuredUser.id);
      })
    );

    setFamilyRooms(refreshedRooms);
    setActiveFamilyId((prev) => {
      if (prev && refreshedRooms.some((room) => room.id === prev)) {
        return prev;
      }

      return refreshedRooms[0]?.id || null;
    });
  }

  async function refreshUploadsFromBackend(roomId = null, ensuredUserOverride = null) {
    const resolvedRoomId = roomId || activeFamilyId;
    if (!user || !resolvedRoomId) {
      setRecords([]);
      return [];
    }

    const ensuredUser = ensuredUserOverride || (await ensureBackendUser(user, { force: true }));
    const uploads = await fetchUploads(resolvedRoomId, ensuredUser.id);
    const mappedRecords = uploads.map(mapUploadToRecord);
    setRecords(mappedRecords);
    return mappedRecords;
  }

  async function handlePrepareDemoScenario() {
    if (!user) {
      Alert.alert("로그인 필요", "데모 시나리오를 준비하려면 먼저 로그인해야 합니다.");
      return;
    }

    try {
      setUploadSaving(true);
      const ensuredUser = await ensureBackendUser(user, { force: true });
      const bootstrapResult = await bootstrapAIDemo({ user_id: ensuredUser.id });
      await refreshFamilyRoomsFromBackend();
      await refreshUploadsFromBackend(bootstrapResult.room_id, ensuredUser);
      setActiveFamilyId(bootstrapResult.room_id);
      setActiveTab("chat");
      Alert.alert(
        "데모 데이터 준비 완료",
        `${bootstrapResult.room_name}에 ${bootstrapResult.seeded_uploads}개의 샘플 기록을 준비했습니다.`
      );
    } catch (error) {
      Alert.alert("데모 준비 실패", getReadableErrorMessage(error, "데모 시나리오를 준비하지 못했습니다."));
    } finally {
      setUploadSaving(false);
    }
  }

  async function ensureBackendUser(currentUser, options = {}) {
    if (!currentUser) {
      throw new Error("\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.");
    }

    if (currentUser.isBackendSynced && !options.force) {
      return currentUser;
    }

    const resolvedIdentity = currentUser.googleSub || currentUser.email || currentUser.id || "user";
    const resolvedEmail = currentUser.email || buildFallbackEmail(resolvedIdentity);
    const syncPayload = {
      google_sub: resolvedIdentity,
      email: resolvedEmail,
      name: currentUser.name || currentUser.email || "\uc0ac\uc6a9\uc790",
      profile_image: currentUser.picture || null,
    };

    const backendUser = await syncUserToBackend(syncPayload);
    const syncedUser = {
      id: backendUser.user_id,
      googleSub: syncPayload.google_sub,
      name: backendUser.name || syncPayload.name,
      email: backendUser.email || syncPayload.email,
      picture: backendUser.profile_image || currentUser.picture || null,
      age: backendUser.age || null,
      gender: backendUser.gender || null,
      phone: backendUser.phone || null,
      profileChunk: backendUser.profile_chunk || null,
      isBackendSynced: true,
    };

    const latestIdentity = latestUserRef.current?.googleSub || latestUserRef.current?.email || latestUserRef.current?.id || null;
    const currentIdentity = currentUser?.googleSub || currentUser?.email || currentUser?.id || null;

    if (latestIdentity && latestIdentity === currentIdentity) {
      setUser(syncedUser);
    }

    return syncedUser;
  }

  async function handleGoogleLogin() {
    if (!googleAuthReady) {
      Alert.alert(
        "Google Web Client ID \uc124\uc815 \ud544\uc694",
        "Google Cloud\uc5d0\uc11c \uc6f9 \uc560\ud50c\ub9ac\ucf00\uc774\uc158 Client ID\ub97c \ub9cc\ub4e0 \ub4a4 App.js\uc758 GOOGLE_WEB_CLIENT_ID\uc5d0 \ub123\uc5b4\uc57c \uc2e4\uc81c Google \ub85c\uadf8\uc778\uc774 \ub3d9\uc791\ud569\ub2c8\ub2e4."
      );
      return;
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const profile = result?.data?.user || result?.user;

      if (!profile) {
        Alert.alert("\ub85c\uadf8\uc778 \uc2e4\ud328", "Google \ud504\ub85c\ud544 \uc815\ubcf4\ub97c \ubc1b\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
        return;
      }

      const provisionalUser = {
        id: profile.id || profile.email || profile.name || "google-user",
        googleSub: profile.id || profile.email || profile.name || "google-user",
        name: profile.name || profile.email || "Google User",
        email: profile.email || buildFallbackEmail(profile.id || profile.name || "google-user"),
        picture: profile.photo || null,
        isBackendSynced: false,
      };

      setUser(provisionalUser);

      const backendUser = await ensureBackendUser(provisionalUser);
      if (!backendUser?.id) {
        throw new Error("\ubc31\uc5d4\ub4dc \uc0ac\uc6a9\uc790 \ub3d9\uae30\ud654\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
      }
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      setUser(null);
      Alert.alert("\ub85c\uadf8\uc778 \uc2e4\ud328", getReadableErrorMessage(error, "Google \ub85c\uadf8\uc778 \uc911 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4."));
    }
  }

  async function handleDemoLogin() {
    try {
      const backendUser = await loginDemoUserToBackend();
      if (!backendUser?.user_id) {
        throw new Error("\ubc31\uc5d4\ub4dc \uc0ac\uc6a9\uc790 \ub3d9\uae30\ud654\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
      }

      setUser({
        id: backendUser.user_id,
        googleSub: "demo-user",
        name: backendUser.name || "\ub370\ubaa8 \uc0ac\uc6a9\uc790",
        email: backendUser.email || "demo@ambient.local",
        picture: backendUser.profile_image || null,
        age: backendUser.age || null,
        gender: backendUser.gender || null,
        phone: backendUser.phone || null,
        profileChunk: backendUser.profile_chunk || null,
        isBackendSynced: true,
      });
    } catch (error) {
      setUser(null);
      Alert.alert("\ub370\ubaa8 \ub85c\uadf8\uc778 \uc2e4\ud328", getReadableErrorMessage(error, "\ubc31\uc5d4\ub4dc \uc0ac\uc6a9\uc790 \ub3d9\uae30\ud654\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4."));
    }
  }

  async function handleSaveApiBaseUrl(nextValue) {
    const normalizedApiBaseUrl = setRuntimeApiBaseUrl(nextValue);
    setApiBaseUrl(normalizedApiBaseUrl);
    Alert.alert("테스트 서버 저장 완료", normalizedApiBaseUrl);
    return normalizedApiBaseUrl;
  }

    async function handleCheckBackendConnection(nextValue = null) {
    const candidateBaseUrl = normalizeApiBaseUrl(nextValue || apiBaseUrl);

    try {
      const result = await checkBackendHealth(candidateBaseUrl);
      if (result?.database === "connected") {
        Alert.alert("서버 연결 성공", `현재 테스트 서버\n${candidateBaseUrl}`);
        return true;
      }

      Alert.alert("서버 연결 실패", `응답은 왔지만 예상한 형식이 아닙니다.\n${candidateBaseUrl}`);
      return false;
    } catch (error) {
      Alert.alert("서버 연결 실패", getReadableErrorMessage(error, `백엔드 연결을 확인하지 못했습니다.\n${candidateBaseUrl}`));
      return false;
    }
  }
async function handleLogout() {
    latestUserRef.current = null;

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.user,
        STORAGE_KEYS.familyRooms,
        STORAGE_KEYS.activeFamilyId,
      ]);
    } catch (_error) {
    }

    try {
      if (googleAuthReady) {
        await GoogleSignin.signOut();
      }
    } catch (_error) {
    }

    setUser(null);
    setFamilyRooms([]);
    setActiveFamilyId(null);
    setRecords([]);
    setActiveTab("home");
  }

  function openProfileEditor() {
    setProfileDraft(buildProfileDraft(user));
    setProfileModalVisible(true);
  }

  async function handleSaveProfile() {
    const cleanName = profileDraft.name.trim();
    const cleanEmail = profileDraft.email.trim();
    const cleanPhone = profileDraft.phone.trim();
    const cleanGender = profileDraft.gender.trim();
    const normalizedAge = profileDraft.age.trim() ? Number.parseInt(profileDraft.age.trim(), 10) : null;

    if (!user?.id) {
      Alert.alert("저장 실패", "로그인 정보가 확인되지 않아 개인정보를 저장할 수 없습니다.");
      return;
    }

    if (!cleanName) {
      Alert.alert("이름 입력 필요", "가족 멤버 상세정보에 표시할 이름을 입력해주세요.");
      return;
    }

    if (profileDraft.age.trim() && (!Number.isFinite(normalizedAge) || normalizedAge <= 0)) {
      Alert.alert("나이 입력 오류", "나이는 1 이상의 숫자로 입력해주세요.");
      return;
    }

    setProfileSaving(true);

    try {
      const ensuredUser = await ensureBackendUser(user, { force: true });
      const updatedProfile = await updateUserProfile(ensuredUser.id, {
        name: cleanName,
        age: normalizedAge,
        gender: cleanGender || null,
        phone: cleanPhone || null,
        email: cleanEmail || ensuredUser.email || "",
      });

      const nextUser = {
        ...ensuredUser,
        name: updatedProfile.name || cleanName,
        email: updatedProfile.email || cleanEmail || ensuredUser.email || "",
        age: updatedProfile.age ?? normalizedAge,
        gender: updatedProfile.gender || cleanGender || null,
        phone: updatedProfile.phone || cleanPhone || null,
        profileChunk: updatedProfile.profile_chunk || null,
        isBackendSynced: true,
      };

      setUser(nextUser);
      setProfileDraft(buildProfileDraft(nextUser));
      setProfileModalVisible(false);
      Alert.alert("\uac1c\uc778\uc815\ubcf4 \uc785\ub825 \uc644\ub8cc", "\uac1c\uc778\uc815\ubcf4\uac00 \uc785\ub825\ub418\uc5c8\uc2b5\ub2c8\ub2e4.");
    } catch (error) {
      Alert.alert("개인정보 저장 실패", getReadableErrorMessage(error, "개인정보를 저장하지 못했습니다."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleCreateFamily(familyName) {
    const cleanName = familyName.trim();
    if (!cleanName) {
      Alert.alert("\uac00\uc871\ubc29 \uc774\ub984 \ud544\uc694", "\uc0dd\uc131\ud560 \uac00\uc871\ubc29 \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.");
      return false;
    }

    try {
      const ensuredUser = await ensureBackendUser(user, { force: true });
      const createdRoom = await apiRequest("/families", {
        method: "POST",
        body: JSON.stringify({
          owner_user_id: ensuredUser.id,
          name: cleanName,
        }),
      });
      const members = await fetchFamilyMembers(createdRoom.room_id);
      const normalizedRoom = mapFamilyRoom(createdRoom, members, ensuredUser.id);

      upsertFamilyRoom(normalizedRoom);
      setActiveFamilyId(normalizedRoom.id);
      Alert.alert("\uac00\uc871\ubc29 \uc0dd\uc131 \uc644\ub8cc", `\ucd08\ub300 \ucf54\ub4dc: ${normalizedRoom.code}`);
      return true;
    } catch (error) {
      Alert.alert("\uac00\uc871\ubc29 \uc0dd\uc131 \uc2e4\ud328", getReadableErrorMessage(error, "\uac00\uc871\ubc29\uc744 \uc0dd\uc131\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."));
      return false;
    }
  }

  async function handleJoinFamily(inviteCode) {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      Alert.alert("\ucf54\ub4dc \uc785\ub825 \ud544\uc694", "\uc785\uc7a5\ud560 \uac00\uc871\ubc29 \ucf54\ub4dc\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.");
      return false;
    }

    try {
      const ensuredUser = await ensureBackendUser(user, { force: true });
      const joinedRoom = await apiRequest("/families/join", {
        method: "POST",
        body: JSON.stringify({
          user_id: ensuredUser.id,
          invite_code: cleanCode,
        }),
      });
      const members = await fetchFamilyMembers(joinedRoom.room_id);
      const normalizedRoom = mapFamilyRoom(joinedRoom, members, ensuredUser.id);

      upsertFamilyRoom(normalizedRoom);
      setActiveFamilyId(normalizedRoom.id);
      Alert.alert("\uc785\uc7a5 \uc644\ub8cc", `${normalizedRoom.name}\uc5d0 \uc785\uc7a5\ud588\uc2b5\ub2c8\ub2e4.`);
      return true;
    } catch (error) {
      Alert.alert("\uac00\uc871\ubc29 \uc785\uc7a5 \uc2e4\ud328", getReadableErrorMessage(error, "\uac00\uc871\ubc29\uc5d0 \uc785\uc7a5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."));
      return false;
    }
  }

  function handleDeleteFamily(room) {
    if (!user?.id) {
      Alert.alert("삭제 실패", "로그인 정보가 확인되지 않아 가족방을 삭제할 수 없습니다.");
      return;
    }

    Alert.alert(
      "가족방 삭제",
      `"${room.name}" 가족방을 삭제할까요?
초대 코드와 멤버 연결 정보가 함께 제거됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFamily(room.id, user.id);
              setFamilyRooms((prev) => prev.filter((item) => item.id !== room.id));
              setActiveFamilyId((prev) => (prev === room.id ? null : prev));
              Alert.alert("가족방 삭제 완료", "가족방이 삭제되었습니다.");
              refreshFamilyRoomsFromBackend().catch(() => {});
            } catch (error) {
              Alert.alert("가족방 삭제 실패", getReadableErrorMessage(error, "가족방을 삭제하지 못했습니다."));
            }
          },
        },
      ]
    );
  }

  async function handleUploadPress(typeKey) {
    if (!activeFamily?.id) {
      Alert.alert("가족방 선택 필요", "업로드를 시작하려면 먼저 가족방을 생성하거나 입장해주세요.");
      setActiveTab("mypage");
      return;
    }

    if (typeKey === "image" || typeKey === "video") {
      await pickMediaFile(typeKey);
      return;
    }

    openUploadModal(typeKey);
  }

  function openUploadModal(typeKey) {
    setSelectedType(typeKey);
    setFormTitle("");
    setFormDetail("");
    setModalVisible(true);
  }

  async function pickMediaFile(typeKey) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "권한이 필요합니다",
        "이미지와 영상을 업로드하려면 사진 보관함 접근 권한을 허용해야 합니다."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        typeKey === "image"
          ? ["images"]
          : ["videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const label = typeKey === "image" ? "이미지" : "영상";
    const fileName = asset.fileName || `${label}-${Date.now()}`;
    const meta = [
      asset.width && asset.height ? `${asset.width} x ${asset.height}` : null,
      asset.duration ? `${Math.round(asset.duration / 1000)}초` : null,
      asset.mimeType,
    ]
      .filter(Boolean)
      .join(" / ");

    try {
      if (!activeFamily?.id) {
        throw new Error("활성 가족방이 없습니다.");
      }

      setUploadSaving(true);
      const ensuredUser = await ensureBackendUser(user, { force: true });
      const uploadEntry = await createUploadEntry({
        room_id: activeFamily.id,
        uploader_user_id: ensuredUser.id,
        type: typeKey,
        title: fileName,
        description: meta || `${label} 파일 업로드`,
      });
      await uploadMediaBinary(uploadEntry.upload_id, ensuredUser.id, asset);
      await refreshUploadsFromBackend(activeFamily.id, ensuredUser);
      setActiveTab("storage");
      Alert.alert("업로드 완료", `${label} 업로드 정보와 파일이 가족방에 저장되었습니다.`);
    } catch (error) {
      Alert.alert("업로드 실패", getReadableErrorMessage(error, `${label} 업로드 정보를 저장하지 못했습니다.`));
    } finally {
      setUploadSaving(false);
    }
  }

  function closeUploadModal() {
    setModalVisible(false);
    setSelectedType(null);
    setFormTitle("");
    setFormDetail("");
  }

  async function handleOpenMedia(item) {
    const targetUrl = item?.fileUrl || item?.uri;
    if (!targetUrl) {
      Alert.alert("파일 보기 불가", "아직 확인할 수 있는 사진 또는 영상 파일이 없습니다.");
      return;
    }

    try {
      await Linking.openURL(targetUrl);
    } catch (error) {
      Alert.alert("파일 열기 실패", getReadableErrorMessage(error, "미디어 파일을 열지 못했습니다."));
    }
  }

  async function handleAddRecord() {
    if (!selectedType || !formTitle.trim()) {
      return;
    }

    if (!activeFamily?.id) {
      Alert.alert("가족방 선택 필요", "업로드를 시작하려면 먼저 가족방을 생성하거나 입장해주세요.");
      setActiveTab("mypage");
      return;
    }

    try {
      setUploadSaving(true);
      const ensuredUser = await ensureBackendUser(user, { force: true });
      await createUploadEntry({
        room_id: activeFamily.id,
        uploader_user_id: ensuredUser.id,
        type: selectedType,
        title: formTitle.trim(),
        description: formDetail.trim() || "추가 설명 없음",
      });
      await refreshUploadsFromBackend(activeFamily.id, ensuredUser);
      closeUploadModal();
      setActiveTab("storage");
      Alert.alert("업로드 완료", "업로드 정보가 가족방 기준으로 저장되었습니다.");
    } catch (error) {
      Alert.alert("업로드 저장 실패", getReadableErrorMessage(error, "업로드 정보를 저장하지 못했습니다."));
    } finally {
      setUploadSaving(false);
    }
  }

  const selectedTypeInfo = uploadTypes.find((item) => item.key === selectedType);
  const profileFormComplete = isProfileFormComplete(profileDraft);

  if (!storageLoaded) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <LoginScreen
        googleAuthReady={googleAuthReady}
        apiBaseUrl={apiBaseUrl}
        onGoogleLogin={handleGoogleLogin}
        onDemoLogin={handleDemoLogin}
        onSaveApiBaseUrl={handleSaveApiBaseUrl}
        onCheckBackendConnection={handleCheckBackendConnection}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />

      <View style={styles.appFrame}>
        <Header activeTab={activeTab} user={user} onLogout={handleLogout} />

        <View style={styles.content}>
          {activeTab === "home" && (
            <HomeScreen
              records={records}
              onUploadPress={handleUploadPress}
            />
          )}
          {activeTab === "chat" && (
            <ChatDemoScreen
              user={user}
              activeFamily={activeFamily}
              modelOptions={availableModels}
              personaOptions={availablePersonas}
              selectedModel={selectedModel}
              selectedPersona={selectedPersona}
              onSelectModel={setSelectedModelId}
              onSelectPersona={setSelectedPersonaId}
              onPrepareDemoScenario={handlePrepareDemoScenario}
              busy={uploadSaving}
            />
          )}
          {activeTab === "storage" && <StorageScreen groupedRecords={groupedRecords} onViewMedia={handleOpenMedia} />}
          {activeTab === "mypage" && (
            <MyPageScreen
              user={user}
              familyRooms={familyRooms}
              activeFamily={activeFamily}
              onCreateFamily={handleCreateFamily}
              onJoinFamily={handleJoinFamily}
              onLogout={handleLogout}
              onOpenProfileEditor={openProfileEditor}
              onDeleteFamily={handleDeleteFamily}
            />
          )}
        </View>

        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <Modal transparent visible={profileModalVisible} onRequestClose={() => {}}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.profileModalSheet}>
            <Text style={styles.modalTitle}>{"\uac1c\uc778\uc815\ubcf4 \uc785\ub825"}</Text>
            <Text style={styles.modalDescription}>{"\uad6c\uae00 \ub85c\uadf8\uc778 \ud6c4 \uac00\uc871 \uba64\ubc84 \uc0c1\uc138\uc815\ubcf4\uc5d0 \uc0ac\uc6a9\ud560 \uae30\ubcf8 \uc815\ubcf4\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694. \uc800\uc7a5 \uc2dc \ud504\ub85c\ud544 \uccad\ud06c\ub85c \ud568\uaed8 \ubcf4\uad00\ub429\ub2c8\ub2e4."}</Text>
            <Text style={styles.modalHint}>{"\ubaa8\ub4e0 \ud56d\ubaa9\uc744 \uc785\ub825\ud574\uc57c \ud655\uc778 \ubc84\ud2bc\uc774 \ud65c\uc131\ud654\ub429\ub2c8\ub2e4."}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\uc774\ub984"}</Text>
              <TextInput
                value={profileDraft.name}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, name: value }))}
                placeholder="\uc608: \ud64d\uae38\ub3d9"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\ub098\uc774"}</Text>
              <TextInput
                value={profileDraft.age}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, age: value }))}
                placeholder="\uc608: 24"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\uc131\ubcc4"}</Text>
              <View style={styles.genderOptionRow}>
                {["\ub0a8\uc131", "\uc5ec\uc131", "\uae30\ud0c0"].map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.genderOptionButton, profileDraft.gender === option && styles.genderOptionButtonActive]}
                    onPress={() => setProfileDraft((prev) => ({ ...prev, gender: option }))}
                  >
                    <Text style={[styles.genderOptionText, profileDraft.gender === option && styles.genderOptionTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\ud734\ub300\ud3f0\ubc88\ud638"}</Text>
              <TextInput
                value={profileDraft.phone}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, phone: value }))}
                placeholder="\uc608: 010-1234-5678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\uc774\uba54\uc77c"}</Text>
              <TextInput
                value={profileDraft.email}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, email: value }))}
                placeholder="\uc608: name@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>

            <Pressable style={[styles.modalButton, styles.submitButton, (!profileFormComplete || profileSaving) && styles.disabledButton]} onPress={handleSaveProfile} disabled={!profileFormComplete || profileSaving}>
              <Text style={styles.submitButtonText}>{profileSaving ? "\uc800\uc7a5 \uc911..." : "\ud655\uc778"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeUploadModal}>

        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{selectedTypeInfo ? `${selectedTypeInfo.label} 업로드` : "업로드"}</Text>
            <Text style={styles.modalDescription}>
              실제 파일 선택 대신 발표용 데모 정보를 입력하면 저장소 화면에 반영됩니다.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="예: 할머니의 창업 조언"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>설명</Text>
              <TextInput
                value={formDetail}
                onChangeText={setFormDetail}
                placeholder="예: 2019년 인터뷰에서 남긴 내용"
                placeholderTextColor="#94A3B8"
                style={[styles.textInput, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={closeUploadModal}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.submitButton]} onPress={handleAddRecord}>
                <Text style={styles.submitButtonText}>저장하기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}



function LoadingScreen() {
  return (
    <SafeAreaView style={[styles.safeArea, styles.loginSafeArea]}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <View style={styles.loadingScreen}>
        <Text style={styles.loginEyebrow}>Ambient Digital Legacy</Text>
        <Text style={styles.loadingTitle}>{"\uc800\uc7a5\ub41c \uae30\ub85d\uc744 \ubd88\ub7ec\uc624\ub294 \uc911"}</Text>
        <Text style={styles.loginDescription}>{"\uc5c5\ub85c\ub4dc \uae30\ub85d\uacfc \uac00\uc871\ubc29 \uc815\ubcf4\ub97c \ud655\uc778\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4."}</Text>
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({
  googleAuthReady,
  apiBaseUrl,
  onGoogleLogin,
  onDemoLogin,
  onSaveApiBaseUrl,
  onCheckBackendConnection,
}) {
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);

  useEffect(() => {
    setServerUrlInput(apiBaseUrl);
  }, [apiBaseUrl]);

    async function submitServerUrl() {
    await onSaveApiBaseUrl(serverUrlInput);
  }

  async function submitServerCheck() {
    await onCheckBackendConnection(serverUrlInput);
  }
  return (
    <SafeAreaView style={[styles.safeArea, styles.loginSafeArea]}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <View style={styles.loginScreen}>
        <View style={styles.loginHero}>
          <Text style={styles.loginEyebrow}>Ambient Digital Legacy</Text>
          <Text style={styles.loginTitle}>{"\uac00\uc871 \uae30\ub85d\uc744\n\uc548\uc804\ud558\uac8c \ubcf4\uad00\ud558\ub294 \uc571"}</Text>
          <Text style={styles.loginDescription}>
            {"Google \uacc4\uc815\uc73c\ub85c \ub85c\uadf8\uc778\ud55c \ud6c4 \uc74c\uc131, \ud14d\uc2a4\ud2b8, \uc774\ubbf8\uc9c0, \uc601\uc0c1 \uae30\ub85d\uc744 \uc5c5\ub85c\ub4dc\ud558\uace0 \uc800\uc7a5\uc18c\uc5d0\uc11c \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."}
          </Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>{"\ub85c\uadf8\uc778"}</Text>

          <View style={styles.serverConfigBox}>
            <Text style={styles.inputLabel}>{"\ud14c\uc2a4\ud2b8 \uc11c\ubc84 \uc8fc\uc18c"}</Text>
            <TextInput
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="예: 192.168.219.136:8000 또는 http://192.168.219.136:8000/api/v1"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.textInput}
            />
            <View style={styles.serverActionRow}>
              <Pressable style={styles.serverSecondaryButton} onPress={submitServerCheck}>
                <Text style={styles.serverSecondaryButtonText}>{"\uc5f0\uacb0 \ud655\uc778"}</Text>
              </Pressable>
              <Pressable style={styles.serverPrimaryButton} onPress={submitServerUrl}>
                <Text style={styles.serverPrimaryButtonText}>{"\uc8fc\uc18c \uc800\uc7a5"}</Text>
              </Pressable>
            </View>
            <Text style={styles.loginHint}>{`현재 서버: ${apiBaseUrl}`}</Text>
          </View>

          <Pressable
            style={[styles.googleButton, !googleAuthReady && styles.googleButtonDisabled]}
            onPress={onGoogleLogin}
          >
            <Text style={styles.googleLogo}>G</Text>
            <Text style={styles.googleButtonText}>{"Google \uacc4\uc815\uc73c\ub85c \uacc4\uc18d"}</Text>
          </Pressable>
          <Pressable style={styles.demoButton} onPress={onDemoLogin}>
            <Text style={styles.demoButtonText}>{"\ub370\ubaa8 \uacc4\uc815\uc73c\ub85c \uba3c\uc800 \ub4e4\uc5b4\uac00\uae30"}</Text>
          </Pressable>
          {!googleAuthReady ? (
            <Text style={styles.loginHint}>
              {"\uc2e4\uc81c Google \ub85c\uadf8\uc778\uc744 \uc0ac\uc6a9\ud558\ub824\uba74 App.js\uc758 Client ID \uc124\uc815\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Header({ activeTab }) {
  const subtitleMap = {
    home: "가족 데이터를 업로드하고 정리하는 메인 메뉴",
    chat: "가족 유산 챗봇 시연 화면",
    storage: "업로드된 음성, 텍스트, 이미지, 영상 기록 확인",
    mypage: "내 정보와 가족방을 관리하는 화면",
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>Ambient Digital Legacy</Text>
        <Text style={styles.headerTitle}>가족 데이터 유산 앱</Text>
        <Text style={styles.headerSubtitle}>{subtitleMap[activeTab]}</Text>
      </View>
    </View>
  );
}

function HomeScreen({ records, onUploadPress }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>가족의 기억을 한곳에 모으는 모바일 저장소</Text>
        <Text style={styles.heroDescription}>
          음성, 텍스트, 이미지, 영상을 업로드하고 추후 검색과 챗봇 응답에 활용할 수 있도록 정리하는 데모 앱입니다.
        </Text>

        <View style={styles.heroStatsRow}>
          <StatCard label="총 저장 항목" value={`${records.length}개`} />
          <StatCard label="지원 형식" value="4종류" />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>업로드 메뉴</Text>
        <Text style={styles.sectionDescription}>
          메인 화면에서 바로 유형별 업로드를 시작할 수 있습니다. 이미지와 영상은 전용 선택 버튼을 통해 업로드합니다.
        </Text>
      </View>

      <View style={styles.uploadGrid}>
        {uploadTypes.map((type) => (
          <Pressable
            key={type.key}
            style={[styles.uploadCard, { backgroundColor: type.tint }]}
            onPress={() => onUploadPress(type.key)}
          >
            <View style={[styles.iconBubble, { backgroundColor: "#FFFFFFB8" }]}>
              <Text style={[styles.iconText, { color: type.color }]}>{type.icon}</Text>
            </View>
            <Text style={styles.uploadTitle}>{type.label}</Text>
            <Text style={styles.uploadDescription}>{type.description}</Text>
            {type.key === "image" || type.key === "video" ? (
              <View style={styles.mediaUiBox}>
                <Text style={styles.mediaUiLabel}>{type.key === "image" ? "이미지 업로드 UI" : "영상 업로드 UI"}</Text>
                <Pressable
                  style={[styles.mediaPickButton, { backgroundColor: type.color }]}
                  onPress={() => onUploadPress(type.key)}
                >
                  <Text style={styles.mediaPickButtonText}>{type.key === "image" ? "이미지 선택하기" : "영상 선택하기"}</Text>
                </Pressable>
                <Text style={styles.mediaUiHint}>선택한 파일은 저장소 화면에서 확인할 수 있습니다.</Text>
              </View>
            ) : (
              <View style={[styles.uploadAction, { backgroundColor: type.color }]}>
                <Text style={styles.uploadActionText}>업로드 추가</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ChatDemoScreen({
  user,
  activeFamily,
  modelOptions,
  personaOptions,
  selectedModel,
  selectedPersona,
  onSelectModel,
  onSelectPersona,
  onPrepareDemoScenario,
  busy,
}) {
  const inferenceLabel =
    selectedModel?.placement === "device" ? "이 기기에서 생성됨" : "가족 금고 정본 모델에서 생성됨";
  const personaHint = selectedPersona?.tone || "기본 페르소나";
  const [query, setQuery] = useState("할아버지가 예전에 하셨던 조언을 요약해줘.");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState(null);

  async function handleRunChatDemo() {
    if (!user?.id) {
      Alert.alert("로그인 필요", "AI 데모를 실행하려면 먼저 로그인해야 합니다.");
      return;
    }

    if (!activeFamily?.id) {
      Alert.alert("가족방 필요", "AI 데모를 실행하려면 먼저 가족방을 생성하거나 입장해주세요.");
      return;
    }

    try {
      setChatLoading(true);
      const result = await fetchAIDemoChat({
        room_id: activeFamily.id,
        user_id: user.id,
        model_id: selectedModel.id,
        persona_id: selectedPersona.id,
        query: query.trim() || "가족 기록을 요약해줘.",
      });
      setChatResult(result);
    } catch (error) {
      Alert.alert("AI 데모 호출 실패", getReadableErrorMessage(error, "AI 데모 응답을 불러오지 못했습니다."));
    } finally {
      setChatLoading(false);
    }
  }

  const responseText = chatResult?.answer || "아직 백엔드 AI 데모를 호출하지 않았습니다. 아래에서 질문을 전송하면 현재 설정 기준의 응답과 근거를 받아옵니다.";
  const evidenceLines = Array.isArray(chatResult?.retrieved_evidence) ? chatResult.retrieved_evidence : [];
  const runtimeSourceLabel =
    chatResult?.inference_source === "family_vault" ? "가족 금고 정본 응답" : inferenceLabel;
  const providerSummary = chatResult
    ? `${chatResult.provider_name || "unknown"} · ${chatResult.provider_mode || "unknown"}`
    : "provider 미호출";

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.chatIntroCard}>
        <Text style={styles.sectionTitle}>개인화 AI 설정 데모</Text>
        <Text style={styles.sectionDescription}>
          모델과 페르소나를 각각 바꾸면서 온디바이스 응답과 가족 금고 응답 구조를 시연하는 화면입니다.
        </Text>
        <Pressable style={[styles.demoScenarioButton, busy && styles.disabledButton]} onPress={onPrepareDemoScenario} disabled={busy}>
          <Text style={styles.demoScenarioButtonText}>{busy ? "데모 준비 중..." : "데모 데이터 준비"}</Text>
        </Pressable>
      </View>

      <View style={styles.aiConfigCard}>
        <Text style={styles.aiConfigTitle}>모델 선택</Text>
        <Text style={styles.aiConfigDescription}>기기 성능과 목적에 따라 온디바이스 모델 또는 가족 금고 모델을 선택합니다.</Text>
        <View style={styles.optionList}>
          {(modelOptions || []).map((option) => {
            const active = option.id === selectedModel?.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => onSelectModel(option.id)}
              >
                <View style={styles.optionHeaderRow}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{option.label}</Text>
                  <View style={[styles.optionPill, active && styles.optionPillActive]}>
                    <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                      {option.placement === "device" ? "온디바이스" : "정본 노드"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.optionDescription, active && styles.optionDescriptionActive]}>{option.summary}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.aiConfigCard}>
        <Text style={styles.aiConfigTitle}>페르소나 선택</Text>
        <Text style={styles.aiConfigDescription}>모델과 분리된 Markdown 페르소나 자산을 연결한다는 가정의 데모 UI입니다.</Text>
        <View style={styles.optionList}>
          {(personaOptions || []).map((option) => {
            const active = option.id === selectedPersona?.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.optionCard, active && styles.optionCardActiveSoft]}
                onPress={() => onSelectPersona(option.id)}
              >
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.tone}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.runtimeSummaryCard}>
        <Text style={styles.runtimeSummaryTitle}>현재 추론 레이어</Text>
        <Text style={styles.runtimeSummaryText}>{runtimeSourceLabel}</Text>
        <Text style={styles.runtimeSummaryMeta}>{selectedModel?.label} · {selectedPersona?.label}</Text>
        <Text style={styles.runtimeSummaryHint}>페르소나 톤: {personaHint}</Text>
        <Text style={styles.runtimeSummaryHint}>Provider 상태: {providerSummary}</Text>
      </View>

      <View style={styles.aiConfigCard}>
        <Text style={styles.aiConfigTitle}>추천 질문</Text>
        <Text style={styles.aiConfigDescription}>발표 중 바로 눌러서 시연할 수 있는 질문입니다.</Text>
        <View style={styles.questionChipRow}>
          {demoQuestionOptions.map((item) => (
            <Pressable key={item} style={styles.questionChip} onPress={() => setQuery(item)}>
              <Text style={styles.questionChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.chatBubbleLeft}>
        <Text style={styles.chatMeta}>가족 유산 챗봇</Text>
        <Text style={styles.chatText}>
          안녕하세요. 저장된 가족 기록과 선택된 페르소나를 바탕으로 답변하는 데모 챗봇입니다.
        </Text>
      </View>

      <View style={styles.chatBubbleRight}>
        <Text style={styles.chatText}>{query}</Text>
      </View>

      <View style={styles.chatBubbleLeft}>
        <Text style={styles.chatMeta}>{chatResult ? "백엔드 데모 응답" : "응답 대기"}</Text>
        <Text style={styles.chatText}>{responseText}</Text>
        <Text style={styles.chatEvidence}>근거 레이어: OCR/STT 기반 memory chunk + persona markdown tone rule</Text>
        {evidenceLines.length ? (
          <View style={styles.chatEvidenceBox}>
            {evidenceLines.map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.chatEvidenceLine}>{line}</Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.chatInputShell}>
        <TextInput
          style={styles.chatInput}
          placeholder="질문을 입력하고 현재 설정으로 전송하세요."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
        />
        <Pressable style={[styles.chatSendButton, chatLoading && styles.disabledButton]} onPress={handleRunChatDemo} disabled={chatLoading}>
          <Text style={styles.chatSendText}>{chatLoading ? "호출중" : "전송"}</Text>
        </Pressable>
      </View>
      <Text style={styles.chatRuntimeHint}>
        {activeFamily?.id ? `현재 가족방: ${activeFamily.name}` : "가족방이 없으면 AI 데모 API를 실행할 수 없습니다."}
      </Text>
    </ScrollView>
  );
}

function StorageScreen({ groupedRecords, onViewMedia }) {
  const [activeStorageType, setActiveStorageType] = useState("image");
  const activeGroup = groupedRecords.find((group) => group.key === activeStorageType) || groupedRecords[0];

  return (
    <View style={styles.storageScreen}>
      <View style={styles.storageTopArea}>
        <Text style={styles.sectionTitle}>{"저장소 확인"}</Text>
        <Text style={styles.sectionDescription}>
          {"사진과 영상은 데이터가 많아질 수 있어 유형별 탭으로 분리했습니다."}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storageTypeTabs}
        >
          {groupedRecords.map((group) => {
            const active = group.key === activeStorageType;
            return (
              <Pressable
                key={group.key}
                style={[
                  styles.storageTypeTab,
                  active && { backgroundColor: group.color, borderColor: group.color },
                ]}
                onPress={() => setActiveStorageType(group.key)}
              >
                <Text style={[styles.storageTypeTabText, active && styles.storageTypeTabTextActive]}>
                  {group.label}
                </Text>
                <Text style={[styles.storageTypeTabCount, active && styles.storageTypeTabTextActive]}>
                  {group.items.length}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.storageListContent} showsVerticalScrollIndicator={false}>
        <View style={styles.storageSection}>
          <View style={styles.storageSectionHeader}>
            <View style={[styles.storageBadge, { backgroundColor: activeGroup.tint }]}>
              <Text style={[styles.storageBadgeText, { color: activeGroup.color }]}> 
                {activeGroup.label}{" 기록"}
              </Text>
            </View>
            <Text style={styles.storageCount}>{activeGroup.items.length}{"개"}</Text>
          </View>

          {activeGroup.items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {"아직 업로드된 "}{activeGroup.label}{" 항목이 없습니다."}
              </Text>
            </View>
          ) : (
            activeGroup.items.map((item) => {
              const previewUrl = item.fileUrl || item.uri || null;
              const canViewMedia = (item.type === "image" || item.type === "video") && previewUrl;

              return (
                <View key={item.id} style={styles.recordCard}>
                  {item.type === "image" && previewUrl ? (
                    <Image source={{ uri: previewUrl }} style={styles.mediaPreviewImage} />
                  ) : null}
                  {item.type === "video" && previewUrl ? (
                    <View style={styles.videoPreviewBox}>
                      <Text style={styles.videoPreviewIcon}>{"▶"}</Text>
                      <Text style={styles.videoPreviewText}>{"영상 파일이 저장되었습니다."}</Text>
                    </View>
                  ) : null}
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <Text style={styles.recordDate}>{item.createdAt}</Text>
                  </View>
                  <Text style={styles.recordDetail}>{item.detail}</Text>
                  {canViewMedia ? (
                    <Pressable style={styles.mediaViewButton} onPress={() => onViewMedia(item)}>
                      <Text style={styles.mediaViewButtonText}>{item.type === "image" ? "사진 보기" : "영상 보기"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}


function MyPageScreen({ user, familyRooms, activeFamily, onCreateFamily, onJoinFamily, onLogout, onOpenProfileEditor, onDeleteFamily }) {
  const [familyMenu, setFamilyMenu] = useState("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  async function submitCreate() {
    const success = await onCreateFamily(familyName);
    if (success) {
      setFamilyName("");
    }
  }

  async function submitJoin() {
    const success = await onJoinFamily(inviteCode);
    if (success) {
      setInviteCode("");
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileAvatarText}>{(user?.name || "U").slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>{"\ub0b4 \uc815\ubcf4"}</Text>
              <Text style={styles.profileName}>{user?.name || "\uc0ac\uc6a9\uc790"}</Text>
              <Text style={styles.profileEmail}>{user?.email || "\uc774\uba54\uc77c \uc5c6\uc74c"}</Text>
            </View>
          </View>

          <View style={styles.profileMetaList}>
            <Text style={styles.profileMetaText}>{"\ub098\uc774 \u00b7 "}{user?.age ? `${user.age}\uc138` : "\ubbf8\uc785\ub825"}</Text>
            <Text style={styles.profileMetaText}>{"\uc131\ubcc4 \u00b7 "}{user?.gender || "\ubbf8\uc785\ub825"}</Text>
            <Text style={styles.profileMetaText}>{"\ud734\ub300\ud3f0\ubc88\ud638 \u00b7 "}{user?.phone || "\ubbf8\uc785\ub825"}</Text>
          </View>

          <Pressable style={styles.inlineProfileButton} onPress={onOpenProfileEditor}>
            <Text style={styles.inlineProfileButtonText}>{"\ub0b4 \uc815\ubcf4 \uc218\uc815"}</Text>
          </Pressable>
        </View>

        <View style={styles.familySummaryCard}>
          <Text style={styles.sectionTitle}>{"\ub0b4 \uac00\uc871"}</Text>
          {activeFamily ? (
            <View style={styles.activeFamilyBox}>
              <Text style={styles.activeFamilyName}>{activeFamily.name}</Text>
              <Text style={styles.activeFamilyMeta}>{"\ucd08\ub300 \ucf54\ub4dc "}{activeFamily.code}</Text>
              <Text style={styles.activeFamilyMeta}>{activeFamily.role}{" \u00b7 "}{activeFamily.members.length}{"\uba85"}</Text>
              {activeFamily.role === "\ubc29\uc7a5" ? (
  <View style={styles.familyDangerZone}>
    <Text style={styles.familyDangerHint}>{"\ubc29\uc7a5\ub9cc \uac00\uc871\ubc29\uc744 \uc0ad\uc81c\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."}</Text>
    <Pressable style={styles.familyDeleteButton} onPress={() => onDeleteFamily(activeFamily)}>
      <Text style={styles.familyDeleteButtonText}>{"\uac00\uc871\ubc29 \uc0ad\uc81c"}</Text>
    </Pressable>
  </View>
) : null}


              <View style={styles.familyMemberList}>
                {activeFamily.members.map((member) => {
                  const memberLabel = member.name || member.email || member.user_id;
                  const memberMeta = member.email && member.email !== memberLabel ? member.email : member.user_id;
                  return (
                    <Pressable key={member.user_id} style={styles.familyMemberItem} onPress={() => setSelectedMember(member)}>
                      <View style={styles.familyMemberAvatar}>
                        <Text style={styles.familyMemberAvatarText}>{memberLabel.slice(0, 1)}</Text>
                      </View>
                      <View style={styles.familyMemberInfo}>
                        <Text style={styles.familyMemberName}>{memberLabel}</Text>
                        <Text style={styles.familyMemberMeta}>{getRoleLabel(member.role)}{" \u00b7 "}{memberMeta}</Text>
                      </View>
                      <Text style={styles.familyMemberLink}>{"\uc0c1\uc138\ubcf4\uae30"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyCardText}>{"\uc544\uc9c1 \uc785\uc7a5\ud55c \uac00\uc871\ubc29\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}</Text>
          )}
        </View>
        <View style={styles.familyBuilderCard}>
          <View style={styles.familyBuilderHeader}>
            <Text style={styles.sectionTitle}>{"\uac00\uc871 \ub9cc\ub4e4\uae30"}</Text>
            <Text style={styles.sectionDescription}>{"\uc0c8 \uac00\uc871\ubc29\uc744 \uc0dd\uc131\ud558\uac70\ub098 \ucd08\ub300 \ucf54\ub4dc\ub85c \uc785\uc7a5\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."}</Text>
          </View>

          <View style={styles.familyModeTabs}>
            <Pressable
              style={[styles.familyModeTab, familyMenu === "create" && styles.familyModeTabActive]}
              onPress={() => setFamilyMenu("create")}
            >
              <Text style={[styles.familyModeText, familyMenu === "create" && styles.familyModeTextActive]}>{"\uc0dd\uc131"}</Text>
            </Pressable>
            <Pressable
              style={[styles.familyModeTab, familyMenu === "join" && styles.familyModeTabActive]}
              onPress={() => setFamilyMenu("join")}
            >
              <Text style={[styles.familyModeText, familyMenu === "join" && styles.familyModeTextActive]}>{"\uc785\uc7a5"}</Text>
            </Pressable>
          </View>

          {familyMenu === "create" ? (
            <View style={styles.familyForm}>
              <Text style={styles.inputLabel}>{"\uac00\uc871\ubc29 \uc774\ub984"}</Text>
              <TextInput
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="\uc608: \uc131\ube48\uc774\ub124 \uac00\uc871\ubc29"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
              <Pressable style={styles.familyPrimaryButton} onPress={submitCreate}>
                <Text style={styles.familyPrimaryButtonText}>{"\ucf54\ub4dc \uc0dd\uc131\ud558\uae30"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.familyForm}>
              <Text style={styles.inputLabel}>{"\ucd08\ub300 \ucf54\ub4dc"}</Text>
              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="\uc608: A1B2C3"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={styles.textInput}
              />
              <Pressable style={styles.familyPrimaryButton} onPress={submitJoin}>
                <Text style={styles.familyPrimaryButtonText}>{"\uac00\uc871\ubc29 \uc785\uc7a5\ud558\uae30"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.storageSection}>
          <Text style={styles.sectionTitle}>{"\uac00\uc871\ubc29 \ubaa9\ub85d"}</Text>
          {familyRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{"\uc0dd\uc131\ud558\uac70\ub098 \uc785\uc7a5\ud55c \uac00\uc871\ubc29\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}</Text>
            </View>
          ) : (
            familyRooms.map((room) => (
              <View key={room.id} style={styles.familyRoomCard}>
                <View style={styles.familyRoomInfoBlock}>
                  <Text style={styles.familyRoomName}>{room.name}</Text>
                  <Text style={styles.familyRoomMeta}>{room.role}{" \u00b7 "}{room.createdAt}</Text>
                </View>
                <View style={styles.familyRoomActions}>
                  <View style={styles.familyCodePill}>
                    <Text style={styles.familyCodeText}>{room.code}</Text>
                  </View>
                  {room.role === "\ubc29\uc7a5" ? (
                    <Pressable style={styles.familyDeleteChip} onPress={() => onDeleteFamily(room)}>
                      <Text style={styles.familyDeleteChipText}>삭제</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.logoutSection}>
          <Pressable style={styles.myPageLogoutButton} onPress={onLogout}>
            <Text style={styles.myPageLogoutText}>{"\ub85c\uadf8\uc544\uc6c3"}</Text>
          </Pressable>
          <Text style={styles.logoutHint}>{"\ub85c\uadf8\uc544\uc6c3\ud558\uba74 \ucc98\uc74c \ub85c\uadf8\uc778 \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4."}</Text>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(selectedMember)} onRequestClose={() => setSelectedMember(null)}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.memberDetailSheet}>
            <Text style={styles.modalTitle}>{"\uac00\uc871 \uba64\ubc84 \uc0c1\uc138\uc815\ubcf4"}</Text>
            {selectedMember ? (
              <>
                <View style={styles.memberDetailHeader}>
                  <View style={styles.memberDetailAvatar}>
                    <Text style={styles.memberDetailAvatarText}>{(selectedMember.name || selectedMember.email || "U").slice(0, 1)}</Text>
                  </View>
                  <View style={styles.memberDetailHeaderInfo}>
                    <Text style={styles.memberDetailName}>{selectedMember.name || "\uc774\ub984 \ubbf8\uc785\ub825"}</Text>
                    <Text style={styles.memberDetailRole}>{getRoleLabel(selectedMember.role)}</Text>
                  </View>
                </View>

                <View style={styles.memberDetailList}>
                  <View style={styles.memberDetailRow}><Text style={styles.memberDetailLabel}>{"\uc774\uba54\uc77c"}</Text><Text style={styles.memberDetailValue}>{selectedMember.email || "\ubbf8\uc785\ub825"}</Text></View>
                  <View style={styles.memberDetailRow}><Text style={styles.memberDetailLabel}>{"\ub098\uc774"}</Text><Text style={styles.memberDetailValue}>{selectedMember.age ? `${selectedMember.age}\uc138` : "\ubbf8\uc785\ub825"}</Text></View>
                  <View style={styles.memberDetailRow}><Text style={styles.memberDetailLabel}>{"\uc131\ubcc4"}</Text><Text style={styles.memberDetailValue}>{selectedMember.gender || "\ubbf8\uc785\ub825"}</Text></View>
                  <View style={styles.memberDetailRow}><Text style={styles.memberDetailLabel}>{"\ud734\ub300\ud3f0\ubc88\ud638"}</Text><Text style={styles.memberDetailValue}>{selectedMember.phone || "\ubbf8\uc785\ub825"}</Text></View>
                </View>

                <View style={styles.chunkCard}>
                  <Text style={styles.chunkTitle}>{"\uc800\uc7a5\ub41c \ud504\ub85c\ud544 \uccad\ud06c"}</Text>
                  <Text style={styles.chunkText}>{selectedMember.profile_chunk || "\uc544\uc9c1 \uc800\uc7a5\ub41c \ud504\ub85c\ud544 \uccad\ud06c\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."}</Text>
                </View>
              </>
            ) : null}

            <Pressable style={[styles.modalButton, styles.submitButton]} onPress={() => setSelectedMember(null)}>
              <Text style={styles.submitButtonText}>{"\ub4a4\ub85c\uac00\uae30"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BottomTabs({ activeTab, onChange }) {
  return (
    <View style={styles.tabBar}>
      {tabItems.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tabItem, active && styles.tabItemActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: StatusBar.currentHeight || 0,
  },
  appFrame: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loginSafeArea: {
    backgroundColor: "#0F172A",
  },
  loginScreen: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 34,
    backgroundColor: "#0F172A",
  },
  loginHero: {
    gap: 16,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
    backgroundColor: "#0F172A",
  },
  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  loginEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  loginTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 43,
    letterSpacing: -1.2,
  },
  loginDescription: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 24,
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  loginCardTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleLogo: {
    color: "#2563EB",
    fontSize: 19,
    fontWeight: "900",
  },
  googleButtonText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  demoButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  demoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  loginHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
  serverConfigBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serverActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  serverSecondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  serverSecondaryButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  serverPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  serverPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  logoutButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#CBD5E1",
  },
  userTextBlock: {
    maxWidth: 230,
  },
  userName: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  userEmail: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  eyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 34,
    gap: 18,
  },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  heroDescription: {
    marginTop: 12,
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
  },
  heroStatsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF14",
    borderRadius: 18,
    padding: 16,
  },
  statLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  sectionDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },
  uploadGrid: {
    gap: 14,
  },
  uploadCard: {
    borderRadius: 24,
    padding: 18,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
    fontWeight: "700",
  },
  uploadTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  uploadDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  uploadAction: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  uploadActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  mediaUiBox: {
    marginTop: 16,
    backgroundColor: "#FFFFFFB0",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  mediaUiLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  mediaPickButton: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPickButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  mediaUiHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
  chatIntroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },
  demoScenarioButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  demoScenarioButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  aiConfigCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  aiConfigTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  aiConfigDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },
  optionList: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 6,
  },
  optionCardActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  optionCardActiveSoft: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  optionTitleActive: {
    color: "#FFFFFF",
  },
  optionDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
  optionDescriptionActive: {
    color: "#CBD5E1",
  },
  optionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E2E8F0",
  },
  optionPillActive: {
    backgroundColor: "#1E293B",
  },
  optionPillText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  optionPillTextActive: {
    color: "#FFFFFF",
  },
  runtimeSummaryCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  runtimeSummaryTitle: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  runtimeSummaryText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  runtimeSummaryMeta: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  runtimeSummaryHint: {
    color: "#93C5FD",
    fontSize: 12,
    lineHeight: 18,
  },
  questionChipRow: {
    gap: 10,
  },
  questionChip: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionChipText: {
    color: "#1E3A8A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  chatBubbleLeft: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderTopLeftRadius: 8,
    padding: 16,
  },
  chatBubbleRight: {
    alignSelf: "flex-end",
    maxWidth: "86%",
    backgroundColor: "#DBEAFE",
    borderRadius: 22,
    borderTopRightRadius: 8,
    padding: 16,
  },
  chatMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 8,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#0F172A",
  },
  chatEvidence: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
  chatEvidenceBox: {
    marginTop: 12,
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
  },
  chatEvidenceLine: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 18,
  },
  chatInputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
  },
  chatInput: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    color: "#64748B",
  },
  chatSendButton: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  chatSendText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chatRuntimeHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  storageScreen: {
    flex: 1,
  },
  storageTopArea: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  storageTypeTabs: {
    gap: 10,
    paddingRight: 22,
  },
  storageTypeTab: {
    minWidth: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  storageTypeTabText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  storageTypeTabCount: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  storageTypeTabTextActive: {
    color: "#FFFFFF",
  },
  storageListContent: {
    paddingHorizontal: 22,
    paddingBottom: 34,
    gap: 16,
  },
  profileCard: {
    backgroundColor: "#0F172A",
    borderRadius: 26,
    padding: 20,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#CBD5E1",
  },
  profileAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#1D4ED8",
    fontSize: 24,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  profileEmail: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 5,
  },
  familySummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  activeFamilyBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  activeFamilyName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  activeFamilyMeta: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  familyMemberList: {
    marginTop: 10,
    gap: 10,
  },
  familyMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  familyMemberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  familyMemberAvatarText: {
    color: "#1D4ED8",
    fontSize: 15,
    fontWeight: "900",
  },
  familyMemberInfo: {
    flex: 1,
    gap: 2,
  },
  familyMemberName: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  familyMemberMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },  familyBuilderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  familyBuilderHeader: {
    gap: 6,
  },
  familyModeTabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    padding: 5,
    gap: 6,
  },
  familyModeTab: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  familyModeTabActive: {
    backgroundColor: "#0F172A",
  },
  familyModeText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "900",
  },
  familyModeTextActive: {
    color: "#FFFFFF",
  },
  familyForm: {
    gap: 10,
  },
  familyPrimaryButton: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  familyPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  familyRoomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  familyRoomName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  familyRoomMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  familyCodePill: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  familyCodeText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  familyDangerZone: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  familyDangerHint: {
    flex: 1,
    color: "#7F1D1D",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  familyDeleteButton: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  familyDeleteButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  familyDeleteChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  familyDeleteChipIcon: {
    fontSize: 11,
  },
  familyDeleteChipText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  logoutSection: {
    gap: 10,
    marginTop: 2,
  },
  myPageLogoutButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  myPageLogoutText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "900",
  },
  logoutHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  storageSection: {
    gap: 12,
  },
  storageSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  storageBadgeText: {
    fontWeight: "800",
    fontSize: 13,
  },
  storageCount: {
    color: "#64748B",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  emptyCardText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  mediaPreviewImage: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  videoPreviewBox: {
    minHeight: 130,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoPreviewIcon: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  videoPreviewText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  recordTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recordDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  recordDetail: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
  },
  tabItemActive: {
    backgroundColor: "#0F172A",
  },
  tabText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  profileMetaList: {
    marginTop: 12,
    gap: 6,
  },
  profileMetaText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  inlineProfileButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "#FFFFFF1A",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineProfileButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  familyMemberLink: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  profileModalSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 16,
  },
  genderOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderOptionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  genderOptionButtonActive: {
    backgroundColor: "#0F172A",
  },
  genderOptionText: {
    color: "#334155",
    fontWeight: "700",
  },
  genderOptionTextActive: {
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.6,
  },
  memberDetailSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 16,
  },
  memberDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  memberDetailAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  memberDetailAvatarText: {
    color: "#1D4ED8",
    fontSize: 22,
    fontWeight: "900",
  },
  memberDetailHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  memberDetailName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  memberDetailRole: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  memberDetailList: {
    gap: 10,
  },
  memberDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberDetailLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  memberDetailValue: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  chunkCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  chunkTitle: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "800",
  },
  chunkText: {
    color: "#1E293B",
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 16,
  },
  modalHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 110,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
  },
  submitButton: {
    backgroundColor: "#0F172A",
    minHeight: 56,
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "700",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
});












