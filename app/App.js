import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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

const STORAGE_KEYS = {
  records: "ambient.records",
  familyRooms: "ambient.familyRooms",
  activeFamilyId: "ambient.activeFamilyId",
  user: "ambient.user",
};

const GOOGLE_WEB_CLIENT_ID = "932487845699-96rqdog8s2ibqiore1jjb1svmvlggdmv.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "932487845699-mtms86ot9h1nj68dr3gnt8tignem2nel.apps.googleusercontent.com";
const API_BASE_URL = "http://172.30.1.79:8000/api/v1";


function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function getNetworkGuidanceMessage() {
  return "\uac19\uc740 PC\uc5d0\uc11c\ub294 127.0.0.1 \uc8fc\uc18c\uac00 \ub3d9\uc791\ud558\uc9c0\ub9cc, \uc2e4\uc81c \ud734\ub300\ud3f0\uc5d0\uc11c\ub294 App.js\uc758 API_BASE_URL\uc744 \uc774 PC\uc758 \ub85c\uceec IP \uc8fc\uc18c\ub85c \ubc14\uafd4\uc57c \ud569\ub2c8\ub2e4. \uc608: http://192.168.0.10:8000/api/v1";
}

function getReadableErrorMessage(error, fallbackMessage) {
  if (error?.message?.includes("Network request failed")) {
    return `${fallbackMessage}\\n\\n${getNetworkGuidanceMessage()}`;
  }

  return error?.message || fallbackMessage;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(buildApiUrl(path), {
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

async function fetchFamilyMembers(roomId) {
  return apiRequest(`/families/${roomId}/members`);
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
  const [storageLoaded, setStorageLoaded] = useState(false);
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

  useEffect(() => {
    async function loadPersistedData() {
      try {
        const [savedRecords, savedFamilyRooms, savedActiveFamilyId, savedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.records),
          AsyncStorage.getItem(STORAGE_KEYS.familyRooms),
          AsyncStorage.getItem(STORAGE_KEYS.activeFamilyId),
          AsyncStorage.getItem(STORAGE_KEYS.user),
        ]);

        if (savedRecords) {
          setRecords(JSON.parse(savedRecords));
        }
        if (savedFamilyRooms) {
          setFamilyRooms(JSON.parse(savedFamilyRooms));
        }
        if (savedActiveFamilyId) {
          setActiveFamilyId(savedActiveFamilyId);
        }
        if (savedUser) {
          setUser(JSON.parse(savedUser));
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

    AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  }, [records, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.familyRooms, JSON.stringify(familyRooms));
  }, [familyRooms, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    if (activeFamilyId) {
      AsyncStorage.setItem(STORAGE_KEYS.activeFamilyId, activeFamilyId);
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.activeFamilyId);
    }
  }, [activeFamilyId, storageLoaded]);

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
    if (!googleAuthReady) {
      return;
    }

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ["profile", "email"],
    });
  }, [googleAuthReady]);

  function upsertFamilyRoom(nextRoom) {
    setFamilyRooms((prev) => [nextRoom, ...prev.filter((room) => room.id !== nextRoom.id)]);
  }

  async function ensureBackendUser(currentUser) {
    if (!currentUser) {
      throw new Error("\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.");
    }

    if (currentUser.isBackendSynced) {
      return currentUser;
    }

    const syncPayload = {
      google_sub: currentUser.googleSub || currentUser.email || currentUser.id,
      email: currentUser.email || "",
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
      isBackendSynced: true,
    };

    setUser(syncedUser);
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

      const syncPayload = {
        google_sub: profile.id || profile.email,
        email: profile.email || "",
        name: profile.name || profile.email || "Google User",
        profile_image: profile.photo || null,
      };
      const backendUser = await syncUserToBackend(syncPayload);

      setUser({
        id: backendUser.user_id,
        googleSub: syncPayload.google_sub,
        name: backendUser.name || syncPayload.name,
        email: backendUser.email || syncPayload.email,
        picture: backendUser.profile_image || syncPayload.profile_image,
        isBackendSynced: true,
      });
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      Alert.alert("\ub85c\uadf8\uc778 \uc2e4\ud328", getReadableErrorMessage(error, "Google \ub85c\uadf8\uc778 \uc911 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4."));
    }
  }

  async function handleDemoLogin() {
    try {
      const syncPayload = {
        google_sub: "demo-user",
        email: "demo@ambient.local",
        name: "\ub370\ubaa8 \uc0ac\uc6a9\uc790",
        profile_image: null,
      };
      const backendUser = await syncUserToBackend(syncPayload);

      setUser({
        id: backendUser.user_id,
        googleSub: syncPayload.google_sub,
        name: backendUser.name || syncPayload.name,
        email: backendUser.email || syncPayload.email,
        picture: null,
        isBackendSynced: true,
      });
    } catch (error) {
      Alert.alert("\ub370\ubaa8 \ub85c\uadf8\uc778 \uc2e4\ud328", getReadableErrorMessage(error, "\ubc31\uc5d4\ub4dc \uc0ac\uc6a9\uc790 \ub3d9\uae30\ud654\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4."));
    }
  }

  async function handleLogout() {
    try {
      if (googleAuthReady) {
        await GoogleSignin.signOut();
      }
    } catch (_error) {
    }

    setUser(null);
    setFamilyRooms([]);
    setActiveFamilyId(null);
    setActiveTab("home");
  }

  async function handleCreateFamily(familyName) {
    const cleanName = familyName.trim();
    if (!cleanName) {
      Alert.alert("\uac00\uc871\ubc29 \uc774\ub984 \ud544\uc694", "\uc0dd\uc131\ud560 \uac00\uc871\ubc29 \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.");
      return false;
    }

    try {
      const ensuredUser = await ensureBackendUser(user);
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
      const ensuredUser = await ensureBackendUser(user);
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
  async function handleUploadPress(typeKey) {
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
        "\uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4",
        "\uc774\ubbf8\uc9c0\uc640 \uc601\uc0c1\uc744 \uc5c5\ub85c\ub4dc\ud558\ub824\uba74 \uc0ac\uc9c4 \ubcf4\uad00\ud568 \uc811\uadfc \uad8c\ud55c\uc744 \ud5c8\uc6a9\ud574\uc57c \ud569\ub2c8\ub2e4."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        typeKey === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const now = new Date();
    const createdAt = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const label = typeKey === "image" ? "\uc774\ubbf8\uc9c0" : "\uc601\uc0c1";
    const fileName = asset.fileName || `${label}-${Date.now()}`;
    const meta = [
      asset.width && asset.height ? `${asset.width} x ${asset.height}` : null,
      asset.duration ? `${Math.round(asset.duration / 1000)}\ucd08` : null,
      asset.mimeType,
    ]
      .filter(Boolean)
      .join(" / ");

    setRecords((prev) => [
      {
        id: `${typeKey}-${Date.now()}`,
        type: typeKey,
        title: fileName,
        detail: meta || `${label} \ud30c\uc77c\uc774 \ub514\ubc14\uc774\uc2a4\uc5d0\uc11c \uc120\ud0dd\ub418\uc5c8\uc2b5\ub2c8\ub2e4.`,
        createdAt,
        uri: asset.uri,
        fileName,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        mimeType: asset.mimeType,
      },
      ...prev,
    ]);

    setActiveTab("storage");
  }

  function closeUploadModal() {
    setModalVisible(false);
    setSelectedType(null);
    setFormTitle("");
    setFormDetail("");
  }

  function handleAddRecord() {
    if (!selectedType || !formTitle.trim()) {
      return;
    }

    const now = new Date();
    const createdAt = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    setRecords((prev) => [
      {
        id: `${selectedType}-${Date.now()}`,
        type: selectedType,
        title: formTitle.trim(),
        detail: formDetail.trim() || "추가 설명 없음",
        createdAt,
      },
      ...prev,
    ]);

    closeUploadModal();
    setActiveTab("storage");
  }

  const selectedTypeInfo = uploadTypes.find((item) => item.key === selectedType);

  if (!storageLoaded) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <LoginScreen
        googleAuthReady={googleAuthReady}
        onGoogleLogin={handleGoogleLogin}
        onDemoLogin={handleDemoLogin}
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
          {activeTab === "chat" && <ChatDemoScreen />}
          {activeTab === "storage" && <StorageScreen groupedRecords={groupedRecords} />}
          {activeTab === "mypage" && (
            <MyPageScreen
              user={user}
              familyRooms={familyRooms}
              activeFamily={activeFamily}
              onCreateFamily={handleCreateFamily}
              onJoinFamily={handleJoinFamily}
              onLogout={handleLogout}
            />
          )}
        </View>

        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>

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
      </Modal>    </SafeAreaView>
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

function LoginScreen({ googleAuthReady, onGoogleLogin, onDemoLogin }) {
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

function ChatDemoScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.chatIntroCard}>
        <Text style={styles.sectionTitle}>챗봇 데모</Text>
        <Text style={styles.sectionDescription}>
          실제 기능은 아직 연결하지 않고, 발표용 시연을 위한 레이아웃만 구성한 화면입니다.
        </Text>
      </View>

      <View style={styles.chatBubbleLeft}>
        <Text style={styles.chatMeta}>가족 유산 챗봇</Text>
        <Text style={styles.chatText}>
          안녕하세요. 저장된 가족 기록을 바탕으로 질문에 답변하는 데모 챗봇입니다.
        </Text>
      </View>

      <View style={styles.chatBubbleRight}>
        <Text style={styles.chatText}>할아버지가 예전에 하셨던 조언을 요약해줘.</Text>
      </View>

      <View style={styles.chatBubbleLeft}>
        <Text style={styles.chatMeta}>데모 응답</Text>
        <Text style={styles.chatText}>
          저장된 인터뷰 메모를 바탕으로, 할아버지는 시작하기 전에 준비를 꼼꼼히 하고 주변 사람과 약속을 지키는 태도를 중요하게 말씀하셨습니다.
        </Text>
      </View>

      <View style={styles.chatInputShell}>
        <TextInput
          style={styles.chatInput}
          placeholder="데모 화면입니다. 입력은 동작하지 않습니다."
          placeholderTextColor="#94A3B8"
          editable={false}
        />
        <View style={styles.chatSendButton}>
          <Text style={styles.chatSendText}>전송</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StorageScreen({ groupedRecords }) {
  const [activeStorageType, setActiveStorageType] = useState("image");
  const activeGroup = groupedRecords.find((group) => group.key === activeStorageType) || groupedRecords[0];

  return (
    <View style={styles.storageScreen}>
      <View style={styles.storageTopArea}>
        <Text style={styles.sectionTitle}>{"\uc800\uc7a5\uc18c \ud655\uc778"}</Text>
        <Text style={styles.sectionDescription}>
          {"\uc0ac\uc9c4\uacfc \uc601\uc0c1\uc740 \ub370\uc774\ud130\uac00 \ub9ce\uc544\uc9c8 \uc218 \uc788\uc5b4 \uc720\ud615\ubcc4 \ud0ed\uc73c\ub85c \ubd84\ub9ac\ud588\uc2b5\ub2c8\ub2e4."}
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
                {activeGroup.label}{" \uae30\ub85d"}
              </Text>
            </View>
            <Text style={styles.storageCount}>{activeGroup.items.length}{"\uac1c"}</Text>
          </View>

          {activeGroup.items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {"\uc544\uc9c1 \uc5c5\ub85c\ub4dc\ub41c "}{activeGroup.label}{" \ud56d\ubaa9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}
              </Text>
            </View>
          ) : (
            activeGroup.items.map((item) => (
              <View key={item.id} style={styles.recordCard}>
                {item.type === "image" && item.uri ? (
                  <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
                ) : null}
                {item.type === "video" && item.uri ? (
                  <View style={styles.videoPreviewBox}>
                    <Text style={styles.videoPreviewIcon}>{"\u25b6"}</Text>
                    <Text style={styles.videoPreviewText}>{"\uc601\uc0c1 \ud30c\uc77c\uc774 \uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4."}</Text>
                  </View>
                ) : null}
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>{item.title}</Text>
                  <Text style={styles.recordDate}>{item.createdAt}</Text>
                </View>
                <Text style={styles.recordDetail}>{item.detail}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}




function MyPageScreen({ user, familyRooms, activeFamily, onCreateFamily, onJoinFamily, onLogout }) {
  const [familyMenu, setFamilyMenu] = useState("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

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
      </View>

      <View style={styles.familySummaryCard}>
        <Text style={styles.sectionTitle}>{"\ub0b4 \uac00\uc871"}</Text>
        {activeFamily ? (
          <View style={styles.activeFamilyBox}>
            <Text style={styles.activeFamilyName}>{activeFamily.name}</Text>
            <Text style={styles.activeFamilyMeta}>{"\ucd08\ub300 \ucf54\ub4dc "}{activeFamily.code}</Text>
            <Text style={styles.activeFamilyMeta}>{activeFamily.role}{" \u00b7 "}{activeFamily.members.length}{"\uba85"}</Text>
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
              <View>
                <Text style={styles.familyRoomName}>{room.name}</Text>
                <Text style={styles.familyRoomMeta}>{room.role}{" \u00b7 "}{room.createdAt}</Text>
              </View>
              <View style={styles.familyCodePill}>
                <Text style={styles.familyCodeText}>{room.code}</Text>
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
  familyBuilderCard: {
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
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "700",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});









