import "react-native-gesture-handler";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView, PinchGestureHandler, State } from "react-native-gesture-handler";

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
  currentUser: "ambient.currentUser",
  accessToken: "ambient.accessToken",
  legacyUser: "ambient.user",
  apiBaseUrl: "ambient.apiBaseUrl",
  selectedModelId: "ambient.selectedModelId",
  selectedPersonaId: "ambient.selectedPersonaId",
};

const DEFAULT_API_BASE_URL = "https://ambient-legacy-backend-279745599452.asia-northeast3.run.app/api/v1";
let runtimeApiBaseUrl = DEFAULT_API_BASE_URL;
let runtimeAccessToken = "";
const KEYBOARD_AVOIDING_BEHAVIOR = Platform.OS === "ios" ? "padding" : "height";
const BASE_TAB_BAR_BOTTOM_PADDING = 22;
const BASE_SCROLL_BOTTOM_PADDING = 112;
const COMMON_SINGLE_LINE_INPUT_PROPS = {
  returnKeyType: "done",
  blurOnSubmit: true,
  onSubmitEditing: Keyboard.dismiss,
};

function getAndroidBottomInset(windowHeight) {
  if (Platform.OS !== "android") {
    return 0;
  }

  const screenHeight = Dimensions.get("screen").height;
  const measuredInset = Math.max(0, Math.round(screenHeight - windowHeight));
  return Math.max(measuredInset, 28);
}

function useAndroidBottomInset() {
  const { height: windowHeight } = useWindowDimensions();
  const [bottomInset, setBottomInset] = useState(() => getAndroidBottomInset(windowHeight));

  useEffect(() => {
    setBottomInset(getAndroidBottomInset(windowHeight));
  }, [windowHeight]);

  return bottomInset;
}

function useKeyboardInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates?.height || 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardInset;
}

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

function setRuntimeAccessToken(nextToken) {
  runtimeAccessToken = String(nextToken || "").trim();
  return runtimeAccessToken;
}

function getRuntimeAccessToken() {
  return runtimeAccessToken;
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

function formatApiErrorDetail(detail, statusCode) {
  if (!detail) {
    return `요청에 실패했습니다. (${statusCode})`;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const normalized = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const location = Array.isArray(item.loc) ? item.loc.join(" > ") : "";
          const message = item.msg || item.message || JSON.stringify(item);
          return location ? `${location}: ${message}` : message;
        }

        return String(item);
      })
      .filter(Boolean);

    return normalized.join("\n");
  }

  if (typeof detail === "object") {
    return detail.message || detail.detail || JSON.stringify(detail, null, 2);
  }

  return String(detail);
}

async function apiRequest(path, options = {}) {
  const authToken = options.includeAuth === false ? "" : getRuntimeAccessToken();
  const response = await fetch(buildApiUrl(path, options.baseUrl || null), {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
    throw new Error(formatApiErrorDetail(detail, response.status));
  }

  return responseData;
}

async function signupWithCredentials(payload) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
    includeAuth: false,
  });
}

async function loginWithCredentials(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    includeAuth: false,
  });
}

async function fetchCurrentUserProfile() {
  return apiRequest("/auth/me");
}

function parseTagInput(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function buildDefaultTagsForType(typeKey) {
  if (typeKey === "image") {
    return ["이미지", "가족기록"];
  }
  if (typeKey === "video") {
    return ["영상", "가족기록"];
  }
  if (typeKey === "voice") {
    return ["음성", "가족기록"];
  }
  return ["텍스트", "가족기록"];
}

function mapBackendUser(payload, fallback = {}) {
  return {
    id: payload?.user_id || fallback.id || "",
    username: payload?.username || fallback.username || "",
    name: payload?.name || fallback.name || "사용자",
    email: payload?.email || fallback.email || "",
    picture: payload?.profile_image || fallback.picture || null,
    age: payload?.age ?? fallback.age ?? null,
    gender: payload?.gender || fallback.gender || null,
    phone: payload?.phone || fallback.phone || null,
    profileChunk: payload?.profile_chunk || fallback.profileChunk || null,
  };
}

async function fetchFamilyMembers(roomId) {
  return apiRequest(`/families/${roomId}/members`);
}

async function fetchFamilyJoinPreview(inviteCode) {
  return apiRequest(`/families/invite/${encodeURIComponent(inviteCode)}`);
}

async function fetchUserFamilies() {
  return apiRequest("/families");
}

async function deleteFamily(roomId) {
  return apiRequest(`/families/${roomId}`, {
    method: "DELETE",
  });
}

async function deleteUploadRecord(uploadId) {
  return apiRequest(`/uploads/${uploadId}`, {
    method: "DELETE",
  });
}

async function updateUserProfile(payload) {
  return apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function deleteCurrentAccount() {
  return apiRequest("/auth/me", {
    method: "DELETE",
  });
}

async function checkBackendHealth(baseUrlOverride = null) {
  return apiRequest(
    "/system/health/db",
    baseUrlOverride ? { baseUrl: normalizeApiBaseUrl(baseUrlOverride), includeAuth: false } : { includeAuth: false }
  );
}

async function fetchUploads(roomId) {
  return apiRequest(`/uploads/${roomId}`);
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

async function bootstrapAIDemo() {
  return apiRequest("/ai/demo-bootstrap", {
    method: "POST",
  });
}

async function fetchAIModels() {
  return apiRequest("/ai/models");
}

async function fetchAIPersonas() {
  return apiRequest("/ai/personas");
}

async function uploadMediaBinary(uploadId, asset) {
  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}`,
    type: asset.mimeType || "application/octet-stream",
  });

  const response = await fetch(
    buildApiUrl(`/uploads/${uploadId}/binary`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(getRuntimeAccessToken() ? { Authorization: `Bearer ${getRuntimeAccessToken()}` } : {}),
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
    throw new Error(detail || `업로드 파일 전송에 실패했습니다. (${response.status})`);
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
    tags: Array.isArray(upload.tags) ? upload.tags : [],
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

function getGenderedRelationName(member, relationToCurrentUser) {
  const gender = member?.gender || "";

  if (relationToCurrentUser === "spouse") {
    if (gender === "여성") {
      return "아내";
    }
    if (gender === "남성") {
      return "남편";
    }
    return "배우자";
  }

  if (relationToCurrentUser === "grandparent") {
    if (gender === "여성") {
      return "할머니";
    }
    if (gender === "남성") {
      return "할아버지";
    }
    return "조부모";
  }

  if (relationToCurrentUser === "parent") {
    if (gender === "여성") {
      return "엄마";
    }
    if (gender === "남성") {
      return "아빠";
    }
    return "부모";
  }

  if (relationToCurrentUser === "child") {
    if (gender === "여성") {
      return "딸";
    }
    if (gender === "남성") {
      return "아들";
    }
    return "자녀";
  }

  return null;
}

function getParentIdFromMemberRelation(member) {
  if (!member?.user_id || !member?.related_to_user_id || !member?.relation_to_related_user) {
    return null;
  }

  if (!["parent", "child"].includes(member.relation_to_related_user)) {
    return null;
  }

  return member.relation_to_related_user === "parent" ? member.user_id : member.related_to_user_id;
}

function getChildIdFromMemberRelation(member) {
  if (!member?.user_id || !member?.related_to_user_id || !member?.relation_to_related_user) {
    return null;
  }

  if (!["parent", "child"].includes(member.relation_to_related_user)) {
    return null;
  }

  return member.relation_to_related_user === "parent" ? member.related_to_user_id : member.user_id;
}

function getParentIdsForUser(userId, members = []) {
  return members
    .filter((member) => getChildIdFromMemberRelation(member) === userId)
    .map((member) => getParentIdFromMemberRelation(member))
    .filter(Boolean);
}

function getSharedParentIds(firstUserId, secondUserId, members = []) {
  const firstParentIds = getParentIdsForUser(firstUserId, members);
  const secondParentIds = getParentIdsForUser(secondUserId, members);
  return firstParentIds.filter((parentId) => secondParentIds.includes(parentId));
}

function getSiblingRelationName(member, currentUser) {
  const memberAge = Number.parseInt(String(member?.age || ""), 10);
  const currentUserAge = Number.parseInt(String(currentUser?.age || ""), 10);
  const memberGender = member?.gender || "";

  if (!Number.isFinite(memberAge) || !Number.isFinite(currentUserAge)) {
    if (memberGender === "여성") {
      return "자매";
    }
    if (memberGender === "남성") {
      return "형제";
    }
    return "형제자매";
  }

  if (memberAge < currentUserAge) {
    if (memberGender === "여성") {
      return "여동생";
    }
    if (memberGender === "남성") {
      return "남동생";
    }
    return "동생";
  }

  if (memberAge === currentUserAge) {
    if (memberGender === "여성") {
      return "자매";
    }
    if (memberGender === "남성") {
      return "형제";
    }
    return "동갑 형제자매";
  }

  const currentUserGender = currentUser?.gender || "";
  if (memberGender === "여성") {
    return currentUserGender === "여성" ? "언니" : "누나";
  }
  if (memberGender === "남성") {
    return currentUserGender === "여성" ? "오빠" : "형";
  }
  return "손위 형제";
}

function getFamilyRelationLabel(member, currentUserId = null, members = []) {
  if (!member?.related_to_user_name || !member?.relation_to_related_user) {
    return null;
  }

  if (currentUserId && member.user_id === currentUserId) {
    return "나";
  }

  if (currentUserId && Array.isArray(members)) {
    const currentUser = members.find((item) => item?.user_id === currentUserId);

    if (member.related_to_user_id === currentUserId) {
      const relationName = getGenderedRelationName(member, member.relation_to_related_user);
      if (relationName) {
        return relationName;
      }
    }

    const currentUserLinkToMember = members.find(
      (item) => item?.user_id === currentUserId && item.related_to_user_id === member.user_id
    );
    if (currentUserLinkToMember) {
      const reverseRelation = currentUserLinkToMember.relation_to_related_user === "parent"
        ? "child"
        : currentUserLinkToMember.relation_to_related_user === "child"
          ? "parent"
          : currentUserLinkToMember.relation_to_related_user;
      const relationName = getGenderedRelationName(member, reverseRelation);
      if (relationName) {
        return relationName;
      }
    }

    const parentIds = getParentIdsForUser(currentUserId, members);
    for (const parentId of parentIds) {
      const parent = members.find((item) => item?.user_id === parentId);
      const grandParentIds = getParentIdsForUser(parentId, members);
      if (grandParentIds.includes(member.user_id)) {
        const grandParentName = getGenderedRelationName(member, "grandparent");
        if (parent?.gender === "남성") {
          return `친${grandParentName}`;
        }
        if (parent?.gender === "여성") {
          return `외${grandParentName}`;
        }
        return grandParentName;
      }
    }

    if (
      currentUser &&
      member.user_id !== currentUserId &&
      getSharedParentIds(member.user_id, currentUserId, members).length > 0
    ) {
      return getSiblingRelationName(member, currentUser);
    }
  }

  const relationLabel =
    member.relation_to_related_user === "parent"
      ? `${member.related_to_user_name}의 부모`
      : member.relation_to_related_user === "child"
        ? `${member.related_to_user_name}의 자녀`
        : `${member.related_to_user_name}의 배우자`;

  return relationLabel;
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
  return Boolean(user?.age && user?.gender && user?.phone);
}

function isProfileFormComplete(draft, mode = "complete") {
  const normalizedAge = draft?.age?.trim() ? Number.parseInt(draft.age.trim(), 10) : null;

  const hasCoreFields = Boolean(
    Number.isFinite(normalizedAge) &&
      normalizedAge > 0 &&
      draft?.gender?.trim() &&
      draft?.phone?.trim()
  );

  if (mode === "edit") {
    return Boolean(hasCoreFields && draft?.name?.trim() && draft?.email?.trim());
  }

  return hasCoreFields;
}

function getRoleLabel(role) {
  return role === "owner" ? "\ubc29\uc7a5" : "\uad6c\uc131\uc6d0";
}

function getMemberDisplayName(member) {
  return member?.name || member?.email || member?.user_id || "가족";
}

function buildFamilyTreeLevels(members = []) {
  const memberMap = new Map();
  const childrenByParent = new Map();
  const childIds = new Set();

  members.forEach((member) => {
    if (member?.user_id) {
      memberMap.set(member.user_id, member);
      childrenByParent.set(member.user_id, []);
    }
  });

  members.forEach((member) => {
    if (
      !member?.user_id ||
      !member?.related_to_user_id ||
      !memberMap.has(member.related_to_user_id) ||
      !["parent", "child"].includes(member.relation_to_related_user)
    ) {
      return;
    }

    const parentId = member.relation_to_related_user === "parent" ? member.user_id : member.related_to_user_id;
    const childId = member.relation_to_related_user === "parent" ? member.related_to_user_id : member.user_id;

    if (memberMap.has(parentId) && memberMap.has(childId) && parentId !== childId) {
      childrenByParent.get(parentId)?.push(memberMap.get(childId));
      childIds.add(childId);
    }
  });

  const roots = members.filter((member) => member?.user_id && !childIds.has(member.user_id));
  const firstLevel = roots.length > 0 ? roots : members.filter((member) => member?.user_id);
  const levels = [];
  const visited = new Set();
  let currentLevel = firstLevel;

  while (currentLevel.length > 0) {
    const uniqueLevel = currentLevel.filter((member) => {
      if (!member?.user_id || visited.has(member.user_id)) {
        return false;
      }
      visited.add(member.user_id);
      return true;
    });

    if (uniqueLevel.length > 0) {
      levels.push(uniqueLevel);
    }

    currentLevel = uniqueLevel.flatMap((member) => childrenByParent.get(member.user_id) || []);
  }

  const unplacedMembers = members.filter((member) => member?.user_id && !visited.has(member.user_id));
  if (unplacedMembers.length > 0) {
    levels.push(unplacedMembers);
  }

  return levels;
}

export default function App() {
  const bottomInset = useAndroidBottomInset();
  const keyboardInset = useKeyboardInset();
  const [activeTab, setActiveTab] = useState("home");
  const [records, setRecords] = useState(initialItems);
  const [selectedType, setSelectedType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [formTags, setFormTags] = useState("");
  const [familyRooms, setFamilyRooms] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [user, setUser] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(getRuntimeApiBaseUrl());
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileDraft, setProfileDraft] = useState(buildProfileDraft(null));
  const [profileEditorMode, setProfileEditorMode] = useState("complete");
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadSavingMessage, setUploadSavingMessage] = useState("업로드 중입니다.");
  const [popupResult, setPopupResult] = useState(null);
  const [popupConfirm, setPopupConfirm] = useState(null);
  const [popupLoading, setPopupLoading] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState("로그인 정보를 확인하고 있습니다.");
  const [sessionRestoreLoading, setSessionRestoreLoading] = useState(false);
  const [workspaceBootstrapLoading, setWorkspaceBootstrapLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(modelOptions);
  const [availablePersonas, setAvailablePersonas] = useState(personaOptions);
  const [selectedModelId, setSelectedModelId] = useState(modelOptions[0].id);
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaOptions[0].id);
  const latestUserRef = useRef(null);
  const profileModalVisibleRef = useRef(false);
  const profileSavingRef = useRef(false);

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
        const [savedAccessToken, savedCurrentUser, savedApiBaseUrl, savedModelId, savedPersonaId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.accessToken),
          AsyncStorage.getItem(STORAGE_KEYS.currentUser),
          AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
          AsyncStorage.getItem(STORAGE_KEYS.selectedModelId),
          AsyncStorage.getItem(STORAGE_KEYS.selectedPersonaId),
        ]);
        AsyncStorage.removeItem(STORAGE_KEYS.legacyUser);

        let cachedUser = null;
        if (savedCurrentUser) {
          cachedUser = JSON.parse(savedCurrentUser);
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

        if (savedAccessToken) {
          setSessionRestoreLoading(true);
          setAuthLoadingMessage("저장된 계정 정보를 확인하고 있습니다.");
          setRuntimeAccessToken(savedAccessToken);
          try {
            const restoredUser = await fetchCurrentUserProfile();
            const mappedUser = mapBackendUser(restoredUser, cachedUser || {});
            await bootstrapWorkspaceForUser(mappedUser);
            setUser(mappedUser);
          } catch (error) {
            setRuntimeAccessToken("");
            await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.currentUser, STORAGE_KEYS.legacyUser]);
            setUser(null);
          } finally {
            setSessionRestoreLoading(false);
            setAuthLoadingMessage("로그인 정보를 확인하고 있습니다.");
          }
        } else if (cachedUser) {
          setUser(null);
        }
      } catch (_error) {
        showPopupResult("저장된 데이터 로드 실패", "로컬에 저장된 데이터를 불러오지 못했습니다.", {
          variant: "error",
        });
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
      AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.currentUser);
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
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    profileModalVisibleRef.current = profileModalVisible;
  }, [profileModalVisible]);

  useEffect(() => {
    profileSavingRef.current = profileSaving;
  }, [profileSaving]);

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
        const rooms = await fetchUserFamilies();
        const hydratedRooms = await Promise.all(
          rooms.map(async (room) => {
            const members = await fetchFamilyMembers(room.room_id);
            return mapFamilyRoom(room, members, user.id);
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
    if (!storageLoaded || sessionRestoreLoading) {
      return;
    }

    if (user && !isProfileComplete(user)) {
      setProfileEditorMode("complete");
      if (!profileModalVisibleRef.current || profileSavingRef.current) {
        setProfileDraft(buildProfileDraft(user));
      }
      setProfileModalVisible(true);
      return;
    }

    if (!profileModalVisibleRef.current || profileSavingRef.current) {
      setProfileEditorMode("complete");
      setProfileModalVisible(false);
    }
  }, [user, storageLoaded, sessionRestoreLoading]);

  useEffect(() => {
    if (activeTab !== "mypage" || !user || familyRooms.length === 0 || profileModalVisible) {
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
  }, [activeTab, user, familyRooms.length, profileModalVisible]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (!user || !activeFamilyId) {
      setRecords([]);
      return;
    }

    let cancelled = false;

    async function syncUploadsForActiveFamily() {
      try {
        const uploads = await fetchUploads(activeFamilyId);
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

  useEffect(() => {
    if (!storageLoaded || !user?.id || !activeFamilyId) {
      return;
    }

    if (activeTab !== "home" && activeTab !== "storage") {
      return;
    }

    let cancelled = false;

    const syncUploads = async () => {
      try {
        const uploads = await fetchUploads(activeFamilyId);
        if (cancelled) {
          return;
        }
        setRecords(uploads.map(mapUploadToRecord));
      } catch (_error) {
      }
    };

    syncUploads();
    const intervalId = setInterval(syncUploads, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeTab, user?.id, activeFamilyId, storageLoaded]);

  function upsertFamilyRoom(nextRoom) {
    setFamilyRooms((prev) => [nextRoom, ...prev.filter((room) => room.id !== nextRoom.id)]);
  }

  async function fetchHydratedFamilyRoomsForUser(nextUser, preferredRoomId = null) {
    const rooms = await fetchUserFamilies();
    const hydratedRooms = await Promise.all(
      rooms.map(async (room) => {
        const members = await fetchFamilyMembers(room.room_id);
        return mapFamilyRoom(room, members, nextUser.id);
      })
    );

    const nextActiveFamilyId =
      preferredRoomId && hydratedRooms.some((room) => room.id === preferredRoomId)
        ? preferredRoomId
        : hydratedRooms[0]?.id || null;

    return {
      hydratedRooms,
      nextActiveFamilyId,
    };
  }

  async function syncAIOptionsForSession() {
    try {
      const [models, personas] = await Promise.all([fetchAIModels(), fetchAIPersonas()]);

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

  async function bootstrapWorkspaceForUser(nextUser) {
    setWorkspaceBootstrapLoading(true);
    setAuthLoadingMessage("가족방과 저장소를 불러오고 있습니다.");

    try {
      const [{ hydratedRooms, nextActiveFamilyId }] = await Promise.all([
        fetchHydratedFamilyRoomsForUser(nextUser, activeFamilyId),
        syncAIOptionsForSession(),
      ]);

      let nextRecords = [];
      if (nextActiveFamilyId) {
        const uploads = await fetchUploads(nextActiveFamilyId);
        nextRecords = uploads.map(mapUploadToRecord);
      }

      setFamilyRooms(hydratedRooms);
      setActiveFamilyId(nextActiveFamilyId);
      setRecords(nextRecords);
    } finally {
      setWorkspaceBootstrapLoading(false);
      setAuthLoadingMessage("로그인 정보를 확인하고 있습니다.");
    }
  }

  async function refreshFamilyRoomsFromBackend() {
    if (!user) {
      return;
    }

    const { hydratedRooms: refreshedRooms } = await fetchHydratedFamilyRoomsForUser(user, activeFamilyId);

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

    const uploads = await fetchUploads(resolvedRoomId);
    const mappedRecords = uploads.map(mapUploadToRecord);
    setRecords(mappedRecords);
    return mappedRecords;
  }

  async function handlePrepareDemoScenario() {
    if (!user) {
      showPopupResult("로그인 필요", "데모 시나리오를 준비하려면 먼저 로그인해야 합니다.", {
        variant: "error",
      });
      return;
    }

    try {
      setUploadSaving(true);
      setUploadSavingMessage("데모 데이터를 준비하고 있습니다.");
      const bootstrapResult = await bootstrapAIDemo();
      await refreshFamilyRoomsFromBackend();
      await refreshUploadsFromBackend(bootstrapResult.room_id);
      setActiveFamilyId(bootstrapResult.room_id);
      setActiveTab("chat");
      showPopupResult(
        "데모 데이터 준비 완료",
        `${bootstrapResult.room_name}에 ${bootstrapResult.seeded_uploads}개의 샘플 기록과 ${bootstrapResult.seeded_files || 0}개의 파일을 준비했습니다.`
      );
    } catch (error) {
      showPopupResult("데모 준비 실패", getReadableErrorMessage(error, "데모 시나리오를 준비하지 못했습니다."), {
        variant: "error",
      });
    } finally {
      setUploadSaving(false);
      setUploadSavingMessage("업로드 중입니다.");
    }
  }

  async function establishAuthenticatedSession(session) {
    const nextToken = session?.access_token;
    const nextUser = mapBackendUser(session?.user);

    if (!nextToken || !nextUser.id) {
      throw new Error("로그인 세션 정보를 확인하지 못했습니다.");
    }

    setRuntimeAccessToken(nextToken);
    await AsyncStorage.setItem(STORAGE_KEYS.accessToken, nextToken);
    setFamilyRooms([]);
    setActiveFamilyId(null);
    setRecords([]);
    setActiveTab("home");
    await bootstrapWorkspaceForUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }

  async function handleCredentialLogin({ username, password }) {
    try {
      setAuthLoading(true);
      setAuthLoadingMessage("로그인 정보를 확인하고 있습니다.");
      const session = await loginWithCredentials({
        username,
        password,
      });
      await establishAuthenticatedSession(session);
    } catch (error) {
      setRuntimeAccessToken("");
      setUser(null);
      await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.currentUser]);
      await AsyncStorage.removeItem(STORAGE_KEYS.legacyUser);
      showPopupResult("로그인 실패", getReadableErrorMessage(error, "아이디 또는 비밀번호를 확인해주세요."), {
        variant: "error",
      });
      throw error;
    } finally {
      setAuthLoading(false);
      setAuthLoadingMessage("로그인 정보를 확인하고 있습니다.");
    }
  }

  async function handleCredentialSignup({ username, password, confirmPassword, name, email }) {
    if (password !== confirmPassword) {
      showPopupResult("회원가입 실패", "비밀번호 확인이 일치하지 않습니다.", {
        variant: "error",
      });
      return;
    }

    try {
      setAuthLoading(true);
      setAuthLoadingMessage("새 계정을 생성하고 있습니다.");
      const session = await signupWithCredentials({
        username,
        password,
        name,
        email,
      });
      await establishAuthenticatedSession(session);
    } catch (error) {
      setRuntimeAccessToken("");
      setUser(null);
      await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.currentUser]);
      await AsyncStorage.removeItem(STORAGE_KEYS.legacyUser);
      showPopupResult("회원가입 실패", getReadableErrorMessage(error, "계정을 생성하지 못했습니다."), {
        variant: "error",
      });
      throw error;
    } finally {
      setAuthLoading(false);
      setAuthLoadingMessage("로그인 정보를 확인하고 있습니다.");
    }
  }

  async function handleSaveApiBaseUrl(nextValue) {
    const normalizedApiBaseUrl = setRuntimeApiBaseUrl(nextValue);
    setApiBaseUrl(normalizedApiBaseUrl);
    showPopupResult("테스트 서버 저장 완료", normalizedApiBaseUrl, {
      variant: "success",
      hint: "로그인과 가족방 동작은 이 서버 주소를 기준으로 진행됩니다.",
    });
    return normalizedApiBaseUrl;
  }

  async function handleCheckBackendConnection(nextValue = null) {
    const candidateBaseUrl = normalizeApiBaseUrl(nextValue || apiBaseUrl);

    try {
      const result = await checkBackendHealth(candidateBaseUrl);
      if (result?.database === "connected") {
        showPopupResult("서버 연결 성공", `현재 테스트 서버\n${candidateBaseUrl}`, {
          variant: "success",
          hint: "이 주소로 가족방과 업로드 기능을 계속 테스트할 수 있습니다.",
        });
        return true;
      }

      showPopupResult("서버 연결 실패", `응답은 왔지만 예상한 형식이 아닙니다.\n${candidateBaseUrl}`, {
        variant: "error",
      });
      return false;
    } catch (error) {
      showPopupResult(
        "서버 연결 실패",
        getReadableErrorMessage(error, `백엔드 연결을 확인하지 못했습니다.\n${candidateBaseUrl}`),
        { variant: "error" }
      );
      return false;
    }
  }

  function showPopupResult(title, message, options = {}) {
    setPopupResult({
      title,
      message,
      variant: options.variant || "success",
      hint:
        options.hint ||
        (options.variant === "error"
          ? "입력 내용과 연결 상태를 다시 확인한 뒤 한 번 더 시도해주세요."
          : "이 작업 결과는 현재 화면과 연결된 데이터에 바로 반영됩니다."),
      buttonLabel: options.buttonLabel || "확인",
    });
  }

  function closePopupResult() {
    setPopupResult(null);
  }

  function openPopupConfirm(config) {
    setPopupConfirm({
      confirmLabel: "확인",
      cancelLabel: "취소",
      variant: "danger",
      ...config,
    });
  }

  function closePopupConfirm() {
    if (popupLoading) {
      return;
    }
    setPopupConfirm(null);
  }

  async function handlePopupConfirm() {
    if (!popupConfirm?.onConfirm) {
      return;
    }

    const currentConfirm = popupConfirm;
    setPopupConfirm(null);

    if (currentConfirm.loadingTitle || currentConfirm.loadingMessage) {
      setPopupLoading({
        title: currentConfirm.loadingTitle || "처리 중",
        message: currentConfirm.loadingMessage || "잠시만 기다려주세요.",
        accentColor: currentConfirm.variant === "danger" ? "#DC2626" : "#2563EB",
      });
    }

    try {
      await currentConfirm.onConfirm();
    } catch (error) {
      showPopupResult(
        currentConfirm.errorTitle || "처리 실패",
        getReadableErrorMessage(error, currentConfirm.errorMessage || "요청을 처리하지 못했습니다."),
        { variant: "error" }
      );
    } finally {
      setPopupLoading(null);
    }
  }

  async function handleLogout() {
    latestUserRef.current = null;
    setRuntimeAccessToken("");

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.currentUser,
        STORAGE_KEYS.accessToken,
        STORAGE_KEYS.legacyUser,
        STORAGE_KEYS.familyRooms,
        STORAGE_KEYS.activeFamilyId,
      ]);
    } catch (_error) {
    }

    setUser(null);
    setFamilyRooms([]);
    setActiveFamilyId(null);
    setRecords([]);
    setProfileModalVisible(false);
    setProfileEditorMode("complete");
    setProfileDraft(buildProfileDraft(null));
    setActiveTab("home");
  }

  function openProfileEditor() {
    setProfileEditorMode("edit");
    setProfileDraft(buildProfileDraft(user));
    setProfileModalVisible(true);
  }

  function closeProfileEditor() {
    if (profileSaving) {
      return;
    }

    setProfileDraft(buildProfileDraft(user));
    setProfileEditorMode("complete");
    setProfileModalVisible(false);
  }

  async function handleSaveProfile() {
    const cleanName = profileDraft.name.trim() || user?.name || "";
    const cleanEmail = profileDraft.email.trim() || user?.email || "";
    const cleanPhone = profileDraft.phone.trim();
    const cleanGender = profileDraft.gender.trim();
    const normalizedAge = profileDraft.age.trim() ? Number.parseInt(profileDraft.age.trim(), 10) : null;

    if (!user?.id) {
      showPopupResult("저장 실패", "로그인 정보가 확인되지 않아 개인정보를 저장할 수 없습니다.", {
        variant: "error",
      });
      return;
    }

    if (profileEditorMode === "edit" && !cleanName) {
      showPopupResult("이름 입력 필요", "가족 멤버 상세정보에 표시할 이름을 입력해주세요.", {
        variant: "error",
      });
      return;
    }

    if (profileEditorMode === "edit" && !cleanEmail) {
      showPopupResult("이메일 입력 필요", "연락 가능한 이메일을 입력해주세요.", {
        variant: "error",
      });
      return;
    }

    if (profileDraft.age.trim() && (!Number.isFinite(normalizedAge) || normalizedAge <= 0)) {
      showPopupResult("나이 입력 오류", "나이는 1 이상의 숫자로 입력해주세요.", {
        variant: "error",
      });
      return;
    }

    setProfileSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        name: cleanName,
        age: normalizedAge,
        gender: cleanGender || null,
        phone: cleanPhone || null,
        email: cleanEmail || user.email || "",
      });

      const nextUser = {
        ...user,
        name: updatedProfile.name || cleanName,
        username: updatedProfile.username || user.username || "",
        email: updatedProfile.email || cleanEmail || user.email || "",
        age: updatedProfile.age ?? normalizedAge,
        gender: updatedProfile.gender || cleanGender || null,
        phone: updatedProfile.phone || cleanPhone || null,
        profileChunk: updatedProfile.profile_chunk || null,
      };

      setUser(nextUser);
      setProfileDraft(buildProfileDraft(nextUser));
      setProfileEditorMode("complete");
      setProfileModalVisible(false);
      showPopupResult(
        profileEditorMode === "edit" ? "내 정보 수정 완료" : "개인정보 입력 완료",
        profileEditorMode === "edit" ? "내 정보가 수정되었습니다." : "개인정보가 입력되었습니다."
      );
    } catch (error) {
      showPopupResult("개인정보 저장 실패", getReadableErrorMessage(error, "개인정보를 저장하지 못했습니다."), {
        variant: "error",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleDeleteAccount() {
    openPopupConfirm({
      title: "회원탈퇴",
      message: "정말 회원탈퇴하시겠습니까?",
      hint: "가족방 소유 정보와 업로드 데이터가 함께 정리되며 되돌릴 수 없습니다.",
      confirmLabel: "회원탈퇴",
      variant: "danger",
      loadingTitle: "회원탈퇴 중",
      loadingMessage: "계정과 연결된 데이터를 정리하고 있습니다.",
      errorTitle: "회원탈퇴 실패",
      errorMessage: "계정을 삭제하지 못했습니다.",
      onConfirm: async () => {
        await deleteCurrentAccount();
        await handleLogout();
        showPopupResult("회원탈퇴 완료", "계정과 연결된 로컬 세션을 정리했습니다.");
      },
    });
  }

  async function handleCreateFamily(familyName) {
    const cleanName = familyName.trim();
    if (!cleanName) {
      showPopupResult("가족방 이름 필요", "생성할 가족방 이름을 입력해주세요.", {
        variant: "error",
      });
      return false;
    }

    try {
      const createdRoom = await apiRequest("/families", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
        }),
      });
      const members = await fetchFamilyMembers(createdRoom.room_id);
      const normalizedRoom = mapFamilyRoom(createdRoom, members, user.id);

      upsertFamilyRoom(normalizedRoom);
      setActiveFamilyId(normalizedRoom.id);
      showPopupResult("가족방 생성 완료", `초대 코드: ${normalizedRoom.code}`, {
        hint: `${normalizedRoom.name} 가족방이 준비되었습니다.`,
      });
      return true;
    } catch (error) {
      showPopupResult("가족방 생성 실패", getReadableErrorMessage(error, "가족방을 생성하지 못했습니다."), {
        variant: "error",
      });
      return false;
    }
  }

  async function prepareJoinFamily(inviteCode) {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      showPopupResult("코드 입력 필요", "입장할 가족방 코드를 입력해주세요.", {
        variant: "error",
      });
      return null;
    }

    try {
      return await fetchFamilyJoinPreview(cleanCode);
    } catch (error) {
      showPopupResult("가족방 정보 확인 실패", getReadableErrorMessage(error, "가족방 정보를 불러오지 못했습니다."), {
        variant: "error",
      });
      return null;
    }
  }

  async function handleJoinFamily(inviteCode, relationSelection = null) {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      showPopupResult("코드 입력 필요", "입장할 가족방 코드를 입력해주세요.", {
        variant: "error",
      });
      return false;
    }

    try {
      const joinedRoom = await apiRequest("/families/join", {
        method: "POST",
        body: JSON.stringify({
          invite_code: cleanCode,
          related_to_user_id: relationSelection?.relatedToUserId || null,
          relation_to_related_user: relationSelection?.relationToRelatedUser || null,
        }),
      });
      const members = await fetchFamilyMembers(joinedRoom.room_id);
      const normalizedRoom = mapFamilyRoom(joinedRoom, members, user.id);

      upsertFamilyRoom(normalizedRoom);
      setActiveFamilyId(normalizedRoom.id);
      showPopupResult("입장 완료", `${normalizedRoom.name}에 입장했습니다.`);
      return true;
    } catch (error) {
      showPopupResult("가족방 입장 실패", getReadableErrorMessage(error, "가족방에 입장하지 못했습니다."), {
        variant: "error",
      });
      return false;
    }
  }

  function handleDeleteFamily(room) {
    if (!user?.id) {
      showPopupResult("삭제 실패", "로그인 정보가 확인되지 않아 가족방을 삭제할 수 없습니다.", {
        variant: "error",
      });
      return;
    }

    openPopupConfirm({
      title: "가족방 삭제",
      message: `"${room.name}" 가족방을 삭제할까요?`,
      hint: "초대 코드와 멤버 연결 정보가 함께 제거됩니다.",
      confirmLabel: "삭제",
      variant: "danger",
      loadingTitle: "가족방 삭제 중",
      loadingMessage: `${room.name} 가족방과 연결된 정보를 정리하고 있습니다.`,
      errorTitle: "가족방 삭제 실패",
      errorMessage: "가족방을 삭제하지 못했습니다.",
      onConfirm: async () => {
        await deleteFamily(room.id);
        setFamilyRooms((prev) => prev.filter((item) => item.id !== room.id));
        setActiveFamilyId((prev) => (prev === room.id ? null : prev));
        refreshFamilyRoomsFromBackend().catch(() => {});
        showPopupResult("가족방 삭제 완료", "가족방이 삭제되었습니다.");
      },
    });
  }

  async function handleUploadPress(typeKey) {
    if (!activeFamily?.id) {
      showPopupResult("가족방 선택 필요", "업로드를 시작하려면 먼저 가족방을 생성하거나 입장해주세요.", {
        variant: "error",
      });
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
    setFormTags("");
    setModalVisible(true);
  }

  function showUploadResult(title, message) {
    showPopupResult(title, message, {
      variant: title.includes("실패") ? "error" : "success",
      hint:
        title === "삭제 완료"
          ? "가족방 저장소와 연결된 미디어 정보까지 함께 정리되었습니다."
          : "가족방 저장소에서 방금 반영된 내용을 바로 확인할 수 있습니다.",
    });
  }

  function openDeleteRecordConfirm(item) {
    openPopupConfirm({
      title: "기록 삭제",
      message: "정말 삭제하시겠습니까?",
      hint: "삭제한 기록은 되돌릴 수 없으며, 저장소와 연결된 파일도 함께 정리됩니다.",
      confirmLabel: "삭제",
      variant: "danger",
      onConfirm: () => handleDeleteRecord(item),
    });
  }

  async function pickMediaFile(typeKey) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showPopupResult("권한이 필요합니다", "이미지와 영상을 업로드하려면 사진 보관함 접근 권한을 허용해야 합니다.", {
        variant: "error",
      });
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
      setUploadSavingMessage(`${label}를 업로드하고 있습니다.`);
      const uploadEntry = await createUploadEntry({
        room_id: activeFamily.id,
        type: typeKey,
        title: fileName,
        description: meta || `${label} 파일 업로드`,
        tags: buildDefaultTagsForType(typeKey),
      });
      await uploadMediaBinary(uploadEntry.upload_id, asset);
      await refreshUploadsFromBackend(activeFamily.id);
      setActiveTab("storage");
      showUploadResult("업로드 완료", `${label} 업로드 정보와 파일이 가족방에 저장되었습니다.`);
    } catch (error) {
      showPopupResult("업로드 실패", getReadableErrorMessage(error, `${label} 업로드 정보를 저장하지 못했습니다.`), {
        variant: "error",
      });
    } finally {
      setUploadSaving(false);
      setUploadSavingMessage("업로드 중입니다.");
    }
  }

  function closeUploadModal() {
    setModalVisible(false);
    setSelectedType(null);
    setFormTitle("");
    setFormDetail("");
    setFormTags("");
  }

  async function handleOpenMedia(item) {
    const targetUrl = item?.fileUrl
      ? `${item.fileUrl}${item.fileUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(
          getRuntimeAccessToken()
        )}`
      : item?.uri;
    if (!targetUrl) {
      showPopupResult("파일 보기 불가", "아직 확인할 수 있는 사진 또는 영상 파일이 없습니다.", {
        variant: "error",
      });
      return;
    }

    try {
      await Linking.openURL(targetUrl);
    } catch (error) {
      showPopupResult("파일 열기 실패", getReadableErrorMessage(error, "미디어 파일을 열지 못했습니다."), {
        variant: "error",
      });
    }
  }

  async function handleAddRecord() {
    if (!selectedType || !formTitle.trim()) {
      return;
    }

    if (!activeFamily?.id) {
      showPopupResult("가족방 선택 필요", "업로드를 시작하려면 먼저 가족방을 생성하거나 입장해주세요.", {
        variant: "error",
      });
      setActiveTab("mypage");
      return;
    }

    try {
      setUploadSaving(true);
      setUploadSavingMessage(`${selectedTypeInfo?.label || "기록"} 업로드 정보를 저장하고 있습니다.`);
      await createUploadEntry({
        room_id: activeFamily.id,
        type: selectedType,
        title: formTitle.trim(),
        description: formDetail.trim() || "추가 설명 없음",
        tags: parseTagInput(formTags).length > 0 ? parseTagInput(formTags) : buildDefaultTagsForType(selectedType),
      });
      await refreshUploadsFromBackend(activeFamily.id);
      closeUploadModal();
      setActiveTab("storage");
      showUploadResult("업로드 완료", "업로드 정보가 가족방 기준으로 저장되었습니다.");
    } catch (error) {
      showPopupResult("업로드 저장 실패", getReadableErrorMessage(error, "업로드 정보를 저장하지 못했습니다."), {
        variant: "error",
      });
    } finally {
      setUploadSaving(false);
      setUploadSavingMessage("업로드 중입니다.");
    }
  }

  async function handleDeleteRecord(item) {
    if (!item?.id || !activeFamily?.id) {
      return;
    }

    try {
      setPopupLoading({
        title: "삭제 중",
        message: `${item.title || "기록"}을 삭제하고 있습니다.`,
        accentColor: "#DC2626",
      });
      await deleteUploadRecord(item.id);
      await refreshUploadsFromBackend(activeFamily.id);
      showUploadResult("삭제 완료", "선택한 기록이 저장소와 클라우드에서 정리되었습니다.");
    } catch (error) {
      showPopupResult("기록 삭제 실패", getReadableErrorMessage(error, "기록을 삭제하지 못했습니다."), {
        variant: "error",
      });
    } finally {
      setPopupLoading(null);
    }
  }

  function renderPopupModals() {
    const resultVariant = popupResult?.variant || "success";
    const resultAccentColor = resultVariant === "error" ? "#DC2626" : "#2563EB";
    const resultIconBackgroundColor = resultVariant === "error" ? "#FEE2E2" : "#DBEAFE";
    const resultIconText = resultVariant === "error" ? "!" : "✓";
    const loadingAccentColor = popupLoading?.accentColor || "#2563EB";
    const confirmIsDanger = popupConfirm?.variant === "danger";

    return (
      <>
        <Modal transparent visible={Boolean(popupConfirm)} onRequestClose={closePopupConfirm}>
          <View style={styles.centerModalBackdrop}>
            <View style={styles.uploadLoadingSheet}>
              <View
                style={[
                  styles.deleteConfirmIcon,
                  !confirmIsDanger
                    ? {
                        backgroundColor: "#DBEAFE",
                      }
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.deleteConfirmIconText,
                    !confirmIsDanger
                      ? {
                          color: "#2563EB",
                        }
                      : null,
                  ]}
                >
                  {confirmIsDanger ? "!" : "?"}
                </Text>
              </View>
              <Text style={styles.uploadLoadingTitle}>{popupConfirm?.title || "확인"}</Text>
              <Text style={styles.uploadLoadingDescription}>{popupConfirm?.message || "이 작업을 진행할까요?"}</Text>
              {popupConfirm?.hint ? <Text style={styles.uploadLoadingHint}>{popupConfirm.hint}</Text> : null}
              <View style={styles.resultButtonRow}>
                <Pressable style={styles.resultSecondaryButton} onPress={closePopupConfirm}>
                  <Text style={styles.resultSecondaryButtonText}>{popupConfirm?.cancelLabel || "취소"}</Text>
                </Pressable>
                <Pressable
                  style={confirmIsDanger ? styles.resultDangerButton : styles.uploadResultButton}
                  onPress={handlePopupConfirm}
                >
                  <Text style={confirmIsDanger ? styles.resultDangerButtonText : styles.uploadResultButtonText}>
                    {popupConfirm?.confirmLabel || "확인"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={Boolean(popupLoading)} onRequestClose={() => {}}>
          <View style={styles.centerModalBackdrop}>
            <View style={styles.uploadLoadingSheet}>
              <ActivityIndicator size="large" color={loadingAccentColor} />
              <Text style={styles.uploadLoadingTitle}>{popupLoading?.title || "처리 중"}</Text>
              <Text style={styles.uploadLoadingDescription}>{popupLoading?.message || "잠시만 기다려주세요."}</Text>
              <Text style={styles.uploadLoadingHint}>
                {popupLoading?.hint || "작업이 완료되면 결과를 안내해드립니다."}
              </Text>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={Boolean(popupResult)} onRequestClose={closePopupResult}>
          <View style={styles.centerModalBackdrop}>
            <View style={styles.uploadLoadingSheet}>
              <View
                style={[
                  styles.uploadResultIcon,
                  {
                    backgroundColor: resultIconBackgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.uploadResultIconText,
                    {
                      color: resultAccentColor,
                    },
                  ]}
                >
                  {resultIconText}
                </Text>
              </View>
              <Text style={styles.uploadLoadingTitle}>{popupResult?.title || "완료"}</Text>
              <Text style={styles.uploadLoadingDescription}>{popupResult?.message || "작업이 완료되었습니다."}</Text>
              <Text style={styles.uploadLoadingHint}>
                {popupResult?.hint || "계속 진행하려면 확인 버튼을 눌러주세요."}
              </Text>
              <Pressable style={styles.uploadResultButton} onPress={closePopupResult}>
                <Text style={styles.uploadResultButtonText}>{popupResult?.buttonLabel || "확인"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  const selectedTypeInfo = uploadTypes.find((item) => item.key === selectedType);
  const profileFormComplete = isProfileFormComplete(profileDraft, profileEditorMode);

  if (!storageLoaded || sessionRestoreLoading || workspaceBootstrapLoading) {
    return <LoadingScreen message={authLoadingMessage} />;
  }

  if (!user) {
    return (
      <>
        <LoginScreen
          authLoading={authLoading}
          authLoadingMessage={authLoadingMessage}
          bottomInset={bottomInset}
          onLogin={handleCredentialLogin}
          onSignup={handleCredentialSignup}
          onShowPopupResult={showPopupResult}
        />
        {renderPopupModals()}
      </>
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
              bottomInset={bottomInset}
              modelOptions={availableModels}
              personaOptions={availablePersonas}
              selectedModel={selectedModel}
              selectedPersona={selectedPersona}
              onSelectModel={setSelectedModelId}
              onSelectPersona={setSelectedPersonaId}
              onPrepareDemoScenario={handlePrepareDemoScenario}
              busy={uploadSaving}
              onShowPopupResult={showPopupResult}
            />
          )}
          {activeTab === "storage" && (
            <StorageScreen
              groupedRecords={groupedRecords}
              bottomInset={bottomInset}
              onViewMedia={handleOpenMedia}
              onDeleteRecord={openDeleteRecordConfirm}
            />
          )}
          {activeTab === "mypage" && (
            <MyPageScreen
              user={user}
              familyRooms={familyRooms}
              activeFamily={activeFamily}
              bottomInset={bottomInset}
              onCreateFamily={handleCreateFamily}
              onPrepareJoinFamily={prepareJoinFamily}
              onJoinFamily={handleJoinFamily}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onOpenProfileEditor={openProfileEditor}
              onDeleteFamily={handleDeleteFamily}
            />
          )}
        </View>

        <BottomTabs activeTab={activeTab} bottomInset={bottomInset} onChange={setActiveTab} />
      </View>

      <Modal
        transparent
        visible={profileModalVisible}
        onRequestClose={profileEditorMode === "edit" ? closeProfileEditor : () => {}}
      >
        <View style={styles.centerModalBackdrop}>
          <ScrollView
            contentContainerStyle={[
              styles.centerModalScrollContent,
              {
                paddingBottom: 28 + bottomInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          <View
            style={[
              styles.profileModalSheet,
              Platform.OS === "android" && keyboardInset > 0
                ? { marginBottom: Math.max(12, keyboardInset - bottomInset) }
                : null,
            ]}
          >
            <Text style={styles.modalTitle}>{profileEditorMode === "edit" ? "내 정보 수정" : "개인정보 입력"}</Text>
            <Text style={styles.modalDescription}>
              {profileEditorMode === "edit"
                ? "현재 계정의 개인정보를 수정합니다. 변경한 내용은 가족 멤버 상세정보와 프로필 청크에 함께 반영됩니다."
                : "회원가입 시 저장한 이름과 이메일을 제외한 기본 정보를 입력해주세요. 저장 시 프로필 청크로 함께 보관됩니다."}
            </Text>
            <Text style={styles.modalHint}>
              {profileEditorMode === "edit"
                ? "이름, 이메일, 나이, 성별, 휴대폰번호를 모두 확인한 뒤 저장해주세요."
                : "나이, 성별, 휴대폰번호를 입력해야 확인 버튼이 활성화됩니다."}
            </Text>

            {profileEditorMode === "edit" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  {...COMMON_SINGLE_LINE_INPUT_PROPS}
                  value={profileDraft.name}
                  onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, name: value }))}
                  placeholder="예: 홍길동"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{"\ub098\uc774"}</Text>
              <TextInput
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
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
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
                value={profileDraft.phone}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, phone: value }))}
                placeholder="\uc608: 010-1234-5678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>

            {profileEditorMode === "edit" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이메일</Text>
                <TextInput
                  {...COMMON_SINGLE_LINE_INPUT_PROPS}
                  value={profileDraft.email}
                  onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, email: value }))}
                  placeholder="예: name@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, profileSaving && styles.disabledButton]}
                onPress={profileEditorMode === "edit" ? closeProfileEditor : handleLogout}
                disabled={profileSaving}
              >
                <Text style={styles.cancelButtonText}>{profileEditorMode === "edit" ? "취소" : "로그아웃"}</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.submitButton, (!profileFormComplete || profileSaving) && styles.disabledButton]} onPress={handleSaveProfile} disabled={!profileFormComplete || profileSaving}>
                <Text style={styles.submitButtonText}>{profileSaving ? "\uc800\uc7a5 \uc911..." : profileEditorMode === "edit" ? "저장" : "확인"}</Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeUploadModal}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            contentContainerStyle={[
              styles.modalScrollContent,
              {
                paddingBottom: bottomInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          <View
            style={[
              styles.modalSheet,
              Platform.OS === "android" && keyboardInset > 0
                ? { marginBottom: Math.max(12, keyboardInset - bottomInset) }
                : null,
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{selectedTypeInfo ? `${selectedTypeInfo.label} 업로드` : "업로드"}</Text>
            <Text style={styles.modalDescription}>
              실제 파일 선택 대신 발표용 데모 정보를 입력하면 저장소 화면에 반영됩니다.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>태그</Text>
              <TextInput
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
                value={formTags}
                onChangeText={setFormTags}
                placeholder="예: OCR, 송년회, 가족행사"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton, uploadSaving && styles.disabledButton]} onPress={closeUploadModal} disabled={uploadSaving}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.submitButton, uploadSaving && styles.disabledButton]} onPress={handleAddRecord} disabled={uploadSaving}>
                <Text style={styles.submitButtonText}>저장하기</Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal transparent visible={uploadSaving} onRequestClose={() => {}}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.uploadLoadingSheet}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.uploadLoadingTitle}>업로드 중</Text>
            <Text style={styles.uploadLoadingDescription}>{uploadSavingMessage}</Text>
            <Text style={styles.uploadLoadingHint}>잠시만 기다려주세요. 업로드가 완료되면 결과를 안내해드립니다.</Text>
          </View>
        </View>
      </Modal>
      {renderPopupModals()}
    </SafeAreaView>
  );
}



function LoadingScreen({ message = "업로드 기록과 가족방 정보를 확인하고 있습니다." }) {
  return (
    <SafeAreaView style={[styles.safeArea, styles.loginSafeArea]}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <View style={styles.loadingScreen}>
        <Text style={styles.loginEyebrow}>Ambient Digital Legacy</Text>
        <Text style={styles.loadingTitle}>{"\uc800\uc7a5\ub41c \uae30\ub85d\uc744 \ubd88\ub7ec\uc624\ub294 \uc911"}</Text>
        <Text style={styles.loginDescription}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({
  authLoading,
  authLoadingMessage,
  bottomInset,
  onLogin,
  onSignup,
  onShowPopupResult,
}) {
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function submitAuth() {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      onShowPopupResult("입력 필요", "아이디와 비밀번호를 입력해주세요.", {
        variant: "error",
      });
      return;
    }

    if (authMode === "signup") {
      const cleanName = name.trim();
      const cleanEmail = email.trim();

      if (!cleanName || !cleanEmail) {
        onShowPopupResult("입력 필요", "회원가입에는 이름과 이메일도 필요합니다.", {
          variant: "error",
        });
        return;
      }

      try {
        await onSignup({
          username: cleanUsername,
          password: cleanPassword,
          confirmPassword,
          name: cleanName,
          email: cleanEmail,
        });
      } catch (_error) {
      }
      return;
    }

    try {
      await onLogin({
        username: cleanUsername,
        password: cleanPassword,
      });
    } catch (_error) {
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.loginSafeArea]}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
        <ScrollView
          contentContainerStyle={[
            styles.loginScreen,
            {
              paddingBottom:
                56 + bottomInset,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <View style={styles.loginHero}>
          <Text style={styles.loginEyebrow}>Ambient Digital Legacy</Text>
          <Text style={styles.loginTitle}>{"\uac00\uc871 \uae30\ub85d\uc744\n\uc548\uc804\ud558\uac8c \ubcf4\uad00\ud558\ub294 \uc571"}</Text>
          <Text style={styles.loginDescription}>
            {"아이디와 비밀번호로 로그인한 뒤 음성, 텍스트, 이미지, 영상 기록을 업로드하고 저장소에서 확인할 수 있습니다."}
          </Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>{authMode === "login" ? "로그인" : "회원가입"}</Text>

          <View style={styles.authFieldStack}>
            <View>
              <Text style={styles.inputLabel}>아이디</Text>
              <TextInput
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
                value={username}
                onChangeText={setUsername}
                placeholder="예: sungbin3120"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <TextInput
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호를 입력해주세요"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={styles.textInput}
              />
            </View>

            {authMode === "signup" ? (
              <>
                <View>
                  <Text style={styles.inputLabel}>비밀번호 확인</Text>
                  <TextInput
                    {...COMMON_SINGLE_LINE_INPUT_PROPS}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="비밀번호를 다시 입력해주세요"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    style={styles.textInput}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>이름</Text>
                  <TextInput
                    {...COMMON_SINGLE_LINE_INPUT_PROPS}
                    value={name}
                    onChangeText={setName}
                    placeholder="예: 박성빈"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>이메일</Text>
                  <TextInput
                    {...COMMON_SINGLE_LINE_INPUT_PROPS}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="예: name@example.com"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={styles.textInput}
                  />
                </View>
              </>
            ) : null}
          </View>

          <Pressable
            style={[styles.demoButton, authLoading && styles.disabledButton]}
            onPress={submitAuth}
            disabled={authLoading}
          >
            <Text style={styles.demoButtonText}>
              {authLoading ? authLoadingMessage : authMode === "login" ? "로그인" : "회원가입"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.googleButton, authLoading && styles.googleButtonDisabled]}
            onPress={() => setAuthMode((prev) => (prev === "login" ? "signup" : "login"))}
            disabled={authLoading}
          >
            <Text style={styles.googleButtonText}>
              {authMode === "login" ? "회원가입으로 전환" : "이미 계정이 있어요"}
            </Text>
          </Pressable>
          {authLoading ? (
            <View style={styles.loginLoadingBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loginLoadingText}>{authLoadingMessage}</Text>
            </View>
          ) : null}
          <Text style={styles.loginHint}>
            {authMode === "login"
              ? "가입한 아이디와 비밀번호로 바로 로그인할 수 있습니다."
              : "회원가입 후 바로 로그인된 상태로 메인 화면에 진입합니다."}
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

// 규칙 게이트 카드 — 백엔드 gate_route별 신뢰 UI (ANSWER 외 경로는 LLM을 부르지 않은 결정론 응답)
const GATE_CARD_META = {
  REFUSE: {
    icon: "🛡️",
    label: "기록에 없는 내용이에요",
    hint: "추측으로 지어내지 않고, 지금 남아 있는 기록만 보여드립니다.",
    bg: "#FFFBEB",
    border: "#FDE68A",
    titleColor: "#B45309",
  },
  NO_RECORD: {
    icon: "📭",
    label: "아직 기록이 없어요",
    hint: "가족 기록을 올리면 그 내용을 근거로 답해 드립니다.",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    titleColor: "#475569",
  },
  CONFLICT: {
    icon: "⚖️",
    label: "기록이 서로 달라요",
    hint: "어느 한쪽으로 단정하지 않고 두 기록을 그대로 보여드립니다.",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    titleColor: "#4338CA",
  },
  CLARIFY: {
    icon: "💬",
    label: "조금 더 구체적으로 알려주세요",
    hint: "어떤 기록인지 좁혀 주시면 그 기록만 근거로 답합니다.",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    titleColor: "#1D4ED8",
  },
};

function describeGateBadge(gateAction) {
  if (!gateAction) return null;
  const dropped = /^dropped_(\d+)$/.exec(gateAction);
  if (dropped) {
    return {
      text: `기록으로 확인되지 않은 문장 ${dropped[1]}개를 제외했어요`,
      bg: "#FFFBEB",
      color: "#B45309",
    };
  }
  if (gateAction === "all_dropped_quote" || gateAction === "fallback_quote") {
    return { text: "생성 문장 대신 기록 원문 인용으로 대체했어요", bg: "#FFFBEB", color: "#B45309" };
  }
  if (gateAction === "pass") {
    return { text: "모든 문장이 기록 근거로 확인됐어요", bg: "#ECFDF5", color: "#047857" };
  }
  return null;
}

function ChatDemoScreen({
  user,
  activeFamily,
  bottomInset,
  modelOptions,
  personaOptions,
  selectedModel,
  selectedPersona,
  onSelectModel,
  onSelectPersona,
  onPrepareDemoScenario,
  busy,
  onShowPopupResult,
}) {
  const inferenceLabel =
    selectedModel?.placement === "device" ? "이 기기에서 생성됨" : "가족 금고 정본 모델에서 생성됨";
  const personaHint = selectedPersona?.tone || "기본 페르소나";
  const [query, setQuery] = useState("할아버지가 예전에 하셨던 조언을 요약해줘.");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState(null);

  async function handleRunChatDemo() {
    if (!user?.id) {
      onShowPopupResult("로그인 필요", "AI 데모를 실행하려면 먼저 로그인해야 합니다.", {
        variant: "error",
      });
      return;
    }

    if (!activeFamily?.id) {
      onShowPopupResult("가족방 필요", "AI 데모를 실행하려면 먼저 가족방을 생성하거나 입장해주세요.", {
        variant: "error",
      });
      return;
    }

    try {
      setChatLoading(true);
      const result = await fetchAIDemoChat({
        room_id: activeFamily.id,
        model_id: selectedModel.id,
        persona_id: selectedPersona.id,
        query: query.trim() || "가족 기록을 요약해줘.",
      });
      setChatResult(result);
    } catch (error) {
      onShowPopupResult("AI 데모 호출 실패", getReadableErrorMessage(error, "AI 데모 응답을 불러오지 못했습니다."), {
        variant: "error",
      });
    } finally {
      setChatLoading(false);
    }
  }

  const responseText = chatResult?.answer || "아직 백엔드 AI 데모를 호출하지 않았습니다. 아래에서 질문을 전송하면 현재 설정 기준의 응답과 근거를 받아옵니다.";
  const evidenceLines = Array.isArray(chatResult?.retrieved_evidence) ? chatResult.retrieved_evidence : [];
  const gateCard = chatResult ? GATE_CARD_META[chatResult.gate_route] || null : null;
  const gateBadge = chatResult && !gateCard ? describeGateBadge(chatResult.gate_action) : null;
  const runtimeSourceLabel =
    chatResult?.inference_source === "family_vault" ? "가족 금고 정본 응답" : inferenceLabel;
  const providerSummary = chatResult
    ? `${chatResult.provider_name || "unknown"} · ${chatResult.provider_mode || "unknown"}`
    : "provider 미호출";

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
          {
          paddingBottom: BASE_SCROLL_BOTTOM_PADDING + bottomInset,
          },
        ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.chatIntroCard}>
        <Text style={styles.sectionTitle}>개인화 AI 설정 데모</Text>
        <Text style={styles.sectionDescription}>
          모델과 페르소나를 각각 바꾸면서 온디바이스 응답과 가족 금고 응답 구조를 시연하는 화면입니다.
        </Text>
        <Pressable style={[styles.demoScenarioButton, busy && styles.disabledButton]} onPress={onPrepareDemoScenario} disabled={busy}>
          <Text style={styles.demoScenarioButtonText}>{busy ? "데모 준비 중..." : "데모 데이터 준비"}</Text>
        </Pressable>
      </View>

      <View style={styles.pipelineCard}>
        <Text style={styles.pipelineTitle}>현재 데모 파이프라인</Text>
        <Text style={styles.pipelineDescription}>
          Cloud SQL에 기록 메타데이터를 저장하고, 이미지 파일은 GCS에 올리며, 태그와 OCR 문맥을 함께 Gemma 검색 근거에 연결합니다.
        </Text>
        <View style={styles.pipelineChipRow}>
          {["Cloud SQL", "GCS 이미지 저장", "태그 기반 검색", "Gemma 응답"].map((item) => (
            <View key={item} style={styles.pipelineChip}>
              <Text style={styles.pipelineChipText}>{item}</Text>
            </View>
          ))}
        </View>
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

      {gateCard ? (
        <View style={[styles.gateCard, { backgroundColor: gateCard.bg, borderColor: gateCard.border }]}>
          <View style={styles.gateCardHeader}>
            <Text style={styles.gateCardIcon}>{gateCard.icon}</Text>
            <Text style={[styles.gateCardTitle, { color: gateCard.titleColor }]}>{gateCard.label}</Text>
          </View>
          <Text style={styles.chatText}>{responseText}</Text>
          <Text style={[styles.gateCardHint, { color: gateCard.titleColor }]}>{gateCard.hint}</Text>
          {evidenceLines.length ? (
            <View style={styles.chatEvidenceBox}>
              <Text style={styles.chatEvidenceCaption}>함께 남아 있는 기록</Text>
              {evidenceLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.chatEvidenceLine}>{line}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.chatBubbleLeft}>
          <Text style={styles.chatMeta}>{chatResult ? "백엔드 데모 응답" : "응답 대기"}</Text>
          <Text style={styles.chatText}>{responseText}</Text>
          {gateBadge ? (
            <View style={[styles.gateBadge, { backgroundColor: gateBadge.bg }]}>
              <Text style={[styles.gateBadgeText, { color: gateBadge.color }]}>✓ {gateBadge.text}</Text>
            </View>
          ) : null}
          <Text style={styles.chatEvidence}>근거 레이어: OCR/STT 기반 memory chunk + persona markdown tone rule</Text>
          {evidenceLines.length ? (
            <View style={styles.chatEvidenceBox}>
              {evidenceLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.chatEvidenceLine}>{line}</Text>
              ))}
            </View>
          ) : null}
        </View>
      )}

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
    </KeyboardAvoidingView>
  );
}

function StorageScreen({ groupedRecords, bottomInset, onViewMedia, onDeleteRecord }) {
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

      <ScrollView
        contentContainerStyle={[
          styles.storageListContent,
          { paddingBottom: BASE_SCROLL_BOTTOM_PADDING + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                  {item.tags?.length ? (
                    <View style={styles.tagRow}>
                      {item.tags.map((tag) => (
                        <View key={`${item.id}-${tag}`} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{`#${tag}`}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.recordActionRow}>
                    {canViewMedia ? (
                      <Pressable style={styles.mediaViewButton} onPress={() => onViewMedia(item)}>
                        <Text style={styles.mediaViewButtonText}>{item.type === "image" ? "사진 보기" : "영상 보기"}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[
                        styles.recordDeleteButton,
                        !canViewMedia && styles.recordDeleteButtonFull,
                      ]}
                      onPress={() => onDeleteRecord(item)}
                    >
                      <Text style={styles.recordDeleteButtonText}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}


function MyPageScreen({
  user,
  familyRooms,
  activeFamily,
  bottomInset,
  onCreateFamily,
  onPrepareJoinFamily,
  onJoinFamily,
  onLogout,
  onDeleteAccount,
  onOpenProfileEditor,
  onDeleteFamily,
}) {
  const [familyMenu, setFamilyMenu] = useState("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinRelationTargetUserId, setJoinRelationTargetUserId] = useState("");
  const [joinRelationType, setJoinRelationType] = useState("child");
  const [familyTreeVisible, setFamilyTreeVisible] = useState(false);
  const familyTreeScale = useRef(new Animated.Value(1)).current;
  const familyTreeBaseScale = useRef(1);
  const familyTreePinchScale = useRef(new Animated.Value(1)).current;
  const familyTreeCombinedScale = Animated.multiply(familyTreeScale, familyTreePinchScale).interpolate({
    inputRange: [0.65, 1, 2.4],
    outputRange: [0.65, 1, 2.4],
    extrapolate: "clamp",
  });
  const handleFamilyTreePinchGesture = Animated.event(
    [{ nativeEvent: { scale: familyTreePinchScale } }],
    { useNativeDriver: true }
  );

  function handleFamilyTreePinchStateChange(event) {
    const nativeEvent = event.nativeEvent;
    if (nativeEvent.oldState === State.ACTIVE) {
      const nextScale = Math.min(2.4, Math.max(0.65, familyTreeBaseScale.current * nativeEvent.scale));
      familyTreeBaseScale.current = nextScale;
      familyTreeScale.setValue(nextScale);
      familyTreePinchScale.setValue(1);
    }
  }

  useEffect(() => {
    if (familyTreeVisible) {
      familyTreeBaseScale.current = 1;
      familyTreeScale.setValue(1);
      familyTreePinchScale.setValue(1);
    }
  }, [familyTreeVisible, familyTreeScale, familyTreePinchScale]);

  async function submitCreate() {
    const success = await onCreateFamily(familyName);
    if (success) {
      setFamilyName("");
    }
  }

  async function submitJoin() {
    const preview = await onPrepareJoinFamily(inviteCode);
    if (!preview) {
      return;
    }

    const previewMembers = Array.isArray(preview.members) ? preview.members : [];
    if (previewMembers.length === 0) {
      const success = await onJoinFamily(inviteCode);
      if (success) {
        setInviteCode("");
      }
      return;
    }

    setJoinPreview(preview);
    setJoinRelationTargetUserId(previewMembers[0]?.user_id || "");
    setJoinRelationType("child");
  }

  async function submitJoinWithRelation() {
    if (!joinPreview) {
      return;
    }

    if (!joinRelationTargetUserId) {
      return;
    }

    const success = await onJoinFamily(inviteCode, {
      relatedToUserId: joinRelationTargetUserId,
      relationToRelatedUser: joinRelationType,
    });
    if (success) {
      setInviteCode("");
      setJoinPreview(null);
      setJoinRelationTargetUserId("");
      setJoinRelationType("child");
    }
  }

  function closeJoinPreview() {
    setJoinPreview(null);
    setJoinRelationTargetUserId("");
    setJoinRelationType("child");
  }

  return (
    <>
      <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: BASE_SCROLL_BOTTOM_PADDING + bottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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

              <Pressable style={styles.familyTreeOpenButton} onPress={() => setFamilyTreeVisible(true)}>
                <View>
                  <Text style={styles.familyTreeOpenTitle}>가족 관계도 보기</Text>
                  <Text style={styles.familyTreeOpenDescription}>입장 시 선택한 부모/자녀 관계를 트리로 확인합니다.</Text>
                </View>
                <Text style={styles.familyTreeOpenArrow}>›</Text>
              </Pressable>

              <View style={styles.familyMemberList}>
                {activeFamily.members.map((member) => {
                  const memberLabel = getMemberDisplayName(member);
                  const memberMeta = member.email && member.email !== memberLabel ? member.email : member.user_id;
                  const relationLabel = getFamilyRelationLabel(member, user?.id, activeFamily.members);
                  return (
                    <Pressable key={member.user_id} style={styles.familyMemberItem} onPress={() => setSelectedMember(member)}>
                      <View style={styles.familyMemberAvatar}>
                        <Text style={styles.familyMemberAvatarText}>{memberLabel.slice(0, 1)}</Text>
                      </View>
                      <View style={styles.familyMemberInfo}>
                        <Text style={styles.familyMemberName}>{memberLabel}</Text>
                        <Text style={styles.familyMemberMeta}>
                          {getRoleLabel(member.role)}
                          {relationLabel ? ` · ${relationLabel}` : ""}
                          {" \u00b7 "}
                          {memberMeta}
                        </Text>
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
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
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
                {...COMMON_SINGLE_LINE_INPUT_PROPS}
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
          <Pressable style={styles.withdrawButton} onPress={onDeleteAccount}>
            <Text style={styles.withdrawButtonText}>회원탈퇴</Text>
          </Pressable>
          <Text style={styles.logoutHint}>{"\ub85c\uadf8\uc544\uc6c3\ud558\uba74 \ucc98\uc74c \ub85c\uadf8\uc778 \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4."}</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

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
      <Modal transparent visible={familyTreeVisible} onRequestClose={() => setFamilyTreeVisible(false)}>
        <GestureHandlerRootView style={styles.gestureModalRoot}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.familyTreeSheet}>
            <View style={styles.familyTreeHeader}>
              <View>
                <Text style={styles.familyTreeEyebrow}>Family Tree</Text>
                <Text style={styles.familyTreeTitle}>{activeFamily?.name || "가족방"} 관계도</Text>
              </View>
              <Pressable style={styles.familyTreeCloseButton} onPress={() => setFamilyTreeVisible(false)}>
                <Text style={styles.familyTreeCloseText}>닫기</Text>
              </Pressable>
            </View>
            <Text style={styles.familyTreeDescription}>
              가족방 입장 시 선택한 부모/자녀 태그를 기준으로 구성원을 세대별로 배치했습니다.
            </Text>

            <ScrollView
              style={styles.familyTreeVerticalScroll}
              contentContainerStyle={styles.familyTreeVerticalContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                nestedScrollEnabled
                contentContainerStyle={styles.familyTreeHorizontalContent}
              >
                <PinchGestureHandler
                  onGestureEvent={handleFamilyTreePinchGesture}
                  onHandlerStateChange={handleFamilyTreePinchStateChange}
                >
                  <Animated.View
                    style={[
                      styles.familyTreeZoomLayer,
                      {
                        transform: [{ scale: familyTreeCombinedScale }],
                      },
                    ]}
                  >
                    <View style={styles.familyTreeCanvas}>
                      {buildFamilyTreeLevels(activeFamily?.members || []).map((level, levelIndex, levels) => (
                        <View key={`level-${levelIndex}`} style={styles.familyTreeLevelBlock}>
                          <View style={styles.familyTreeLevelBadge}>
                            <Text style={styles.familyTreeLevelBadgeText}>{levelIndex + 1}세대</Text>
                          </View>
                          <View style={styles.familyTreeLevelRow}>
                            {level.map((member) => {
                              const isCurrentUser = member.user_id === user?.id;
                              return (
                                <View
                                  key={member.user_id}
                                  style={[
                                    styles.familyTreeMemberCard,
                                    isCurrentUser && styles.familyTreeMemberCardActive,
                                  ]}
                                >
                                  <View style={styles.familyTreeMemberTop}>
                                    <View
                                      style={[
                                        styles.familyTreeAvatar,
                                        member.gender === "여성" && styles.familyTreeAvatarFemale,
                                      ]}
                                    >
                                      <Text style={styles.familyTreeAvatarText}>
                                        {getMemberDisplayName(member).slice(0, 1)}
                                      </Text>
                                    </View>
                                    <View style={styles.familyTreeMemberInfo}>
                                      <Text
                                        style={[
                                          styles.familyTreeMemberName,
                                          isCurrentUser && styles.familyTreeMemberNameActive,
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {getMemberDisplayName(member)}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.familyTreeMemberRole,
                                          isCurrentUser && styles.familyTreeMemberRoleActive,
                                        ]}
                                      >
                                        {isCurrentUser ? "나 · " : ""}
                                        {getRoleLabel(member.role)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.familyTreeMetaList}>
                                    <Text style={styles.familyTreeMetaText}>나이: {member.age ? `${member.age}세` : "미입력"}</Text>
                                    <Text style={styles.familyTreeMetaText}>성별: {member.gender || "미입력"}</Text>
                                    <Text style={styles.familyTreeMetaText} numberOfLines={1}>연락처: {member.phone || "미입력"}</Text>
                                <Text style={styles.familyTreeRelationText}>
                                  {getFamilyRelationLabel(member, user?.id, activeFamily?.members || []) || "기준 구성원"}
                                </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                          {levelIndex < levels.length - 1 ? <View style={styles.familyTreeConnector} /> : null}
                        </View>
                      ))}
                    </View>
                  </Animated.View>
                </PinchGestureHandler>
              </ScrollView>
            </ScrollView>

            <Text style={styles.familyTreeHint}>
              두 손가락으로 확대/축소하고, 위아래와 좌우로 밀어 전체 관계도를 확인할 수 있습니다.
            </Text>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>
      <Modal transparent visible={Boolean(joinPreview)} onRequestClose={closeJoinPreview}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.joinFamilyRelationSheet}>
            <View style={styles.uploadResultIcon}>
              <Text style={styles.uploadResultIconText}>◎</Text>
            </View>
            <Text style={styles.uploadLoadingTitle}>가족 관계 선택</Text>
            <Text style={styles.uploadLoadingDescription}>
              {joinPreview ? `${joinPreview.name}에 입장하기 전에 이미 들어와 있는 가족을 기준으로 관계를 선택해주세요.` : ""}
            </Text>
            <Text style={styles.uploadLoadingHint}>이 정보는 이후 가족 트리와 호칭 구조를 만드는 기준으로 사용됩니다.</Text>

            <View style={styles.joinRelationSection}>
              <Text style={styles.inputLabel}>기준 가족 구성원</Text>
              <View style={styles.joinRelationOptionList}>
                {joinPreview?.members?.map((member) => {
                  const isActive = joinRelationTargetUserId === member.user_id;
                  return (
                    <Pressable
                      key={member.user_id}
                      style={[styles.joinRelationMemberOption, isActive && styles.joinRelationMemberOptionActive]}
                      onPress={() => setJoinRelationTargetUserId(member.user_id)}
                    >
                      <Text
                        style={[
                          styles.joinRelationMemberOptionText,
                          isActive && styles.joinRelationMemberOptionTextActive,
                        ]}
                      >
                        {member.name || member.email || member.user_id}
                      </Text>
                      <Text
                        style={[
                          styles.joinRelationMemberOptionMeta,
                          isActive && styles.joinRelationMemberOptionTextActive,
                        ]}
                      >
                        {getRoleLabel(member.role)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.joinRelationSection}>
              <Text style={styles.inputLabel}>관계 선택</Text>
              <View style={styles.joinRelationToggleRow}>
                <Pressable
                  style={[
                    styles.joinRelationToggle,
                    joinRelationType === "child" && styles.joinRelationToggleActive,
                  ]}
                  onPress={() => setJoinRelationType("child")}
                >
                  <Text
                    style={[
                      styles.joinRelationToggleText,
                      joinRelationType === "child" && styles.joinRelationToggleTextActive,
                    ]}
                  >
                    이 사람의 자녀
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.joinRelationToggle,
                    joinRelationType === "parent" && styles.joinRelationToggleActive,
                  ]}
                  onPress={() => setJoinRelationType("parent")}
                >
                  <Text
                    style={[
                      styles.joinRelationToggleText,
                      joinRelationType === "parent" && styles.joinRelationToggleTextActive,
                    ]}
                  >
                    이 사람의 부모
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.joinRelationToggle,
                    joinRelationType === "spouse" && styles.joinRelationToggleActive,
                  ]}
                  onPress={() => setJoinRelationType("spouse")}
                >
                  <Text
                    style={[
                      styles.joinRelationToggleText,
                      joinRelationType === "spouse" && styles.joinRelationToggleTextActive,
                    ]}
                  >
                    이 사람의 배우자
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.resultButtonRow}>
              <Pressable style={styles.resultSecondaryButton} onPress={closeJoinPreview}>
                <Text style={styles.resultSecondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={styles.uploadResultButton}
                onPress={submitJoinWithRelation}
                disabled={!joinRelationTargetUserId}
              >
                <Text style={styles.uploadResultButtonText}>입장하기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BottomTabs({ activeTab, bottomInset, onChange }) {
  return (
    <View style={[styles.tabBar, { paddingBottom: BASE_TAB_BAR_BOTTOM_PADDING + bottomInset }]}>
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
  gestureModalRoot: {
    flex: 1,
  },
  loginSafeArea: {
    backgroundColor: "#0F172A",
  },
  loginScreen: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 56,
    backgroundColor: "#0F172A",
    gap: 28,
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
  keyboardAvoidingContainer: {
    flex: 1,
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
  authFieldStack: {
    gap: 12,
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
  loginLoadingBox: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loginLoadingText: {
    flex: 1,
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
    paddingBottom: 112,
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
  pipelineCard: {
    backgroundColor: "#E0F2FE",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  pipelineTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0C4A6E",
  },
  pipelineDescription: {
    color: "#075985",
    fontSize: 13,
    lineHeight: 20,
  },
  pipelineChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pipelineChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  pipelineChipText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "800",
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
  chatEvidenceCaption: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  gateCard: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    borderRadius: 22,
    borderTopLeftRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  gateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  gateCardIcon: {
    fontSize: 14,
  },
  gateCardTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  gateCardHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  gateBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gateBadgeText: {
    fontSize: 11,
    fontWeight: "600",
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
    paddingBottom: 112,
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
  familyTreeOpenButton: {
    marginTop: 14,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  familyTreeOpenTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  familyTreeOpenDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  familyTreeOpenArrow: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "900",
  },
  familyTreeSheet: {
    width: "92%",
    height: "86%",
    backgroundColor: "#F8FAFC",
    borderRadius: 30,
    padding: 18,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  familyTreeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  familyTreeEyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  familyTreeTitle: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  familyTreeCloseButton: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  familyTreeCloseText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  familyTreeDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  familyTreeVerticalScroll: {
    flex: 1,
    borderRadius: 24,
  },
  familyTreeVerticalContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  familyTreeHorizontalContent: {
    flexGrow: 1,
  },
  familyTreeZoomLayer: {
    alignSelf: "flex-start",
  },
  familyTreeCanvas: {
    minWidth: 560,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  familyTreeLevelBlock: {
    alignItems: "center",
    gap: 8,
  },
  familyTreeLevelBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  familyTreeLevelBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  familyTreeLevelRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  familyTreeMemberCard: {
    width: 172,
    minHeight: 136,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
    gap: 8,
  },
  familyTreeMemberCardActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#F59E0B",
    borderWidth: 3,
  },
  familyTreeMemberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  familyTreeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  familyTreeAvatarFemale: {
    backgroundColor: "#FCE7F3",
  },
  familyTreeAvatarText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  familyTreeMemberInfo: {
    flex: 1,
    gap: 2,
  },
  familyTreeMemberName: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  familyTreeMemberNameActive: {
    color: "#FFFFFF",
  },
  familyTreeMemberRole: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },
  familyTreeMemberRoleActive: {
    color: "#BFDBFE",
  },
  familyTreeMetaList: {
    gap: 4,
  },
  familyTreeMetaText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  familyTreeRelationText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
  },
  familyTreeConnector: {
    width: 2,
    height: 20,
    backgroundColor: "#94A3B8",
    borderRadius: 999,
  },
  familyTreeHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
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
  withdrawButton: {
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  withdrawButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
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
  recordActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  mediaViewButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  mediaViewButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
  },
  recordDeleteButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  recordDeleteButtonFull: {
    flex: 1,
  },
  recordDeleteButtonText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 22,
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
  centerModalScrollContent: {
    flexGrow: 1,
    width: "100%",
    justifyContent: "center",
    paddingVertical: 28,
  },
  uploadLoadingSheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  uploadLoadingTitle: {
    marginTop: 6,
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  uploadLoadingDescription: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
  uploadLoadingHint: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  uploadResultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  uploadResultIconText: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "900",
  },
  uploadResultButton: {
    marginTop: 8,
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadResultButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  deleteConfirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  deleteConfirmIconText: {
    color: "#DC2626",
    fontSize: 30,
    fontWeight: "900",
  },
  resultButtonRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 10,
    marginTop: 8,
  },
  resultSecondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  resultSecondaryButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
  resultDangerButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  resultDangerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
  joinFamilyRelationSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 18,
  },
  joinRelationSection: {
    gap: 10,
  },
  joinRelationOptionList: {
    gap: 10,
  },
  joinRelationMemberOption: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  joinRelationMemberOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  joinRelationMemberOptionText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  joinRelationMemberOptionMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  joinRelationMemberOptionTextActive: {
    color: "#1D4ED8",
  },
  joinRelationToggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  joinRelationToggle: {
    flexGrow: 1,
    flexBasis: "30%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  joinRelationToggleActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  joinRelationToggleText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  joinRelationToggleTextActive: {
    color: "#1D4ED8",
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
  modalScrollContent: {
    flexGrow: 1,
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
