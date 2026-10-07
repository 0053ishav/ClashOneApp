import * as ImagePicker from "expo-image-picker";

export async function requestGalleryPermission() {
  const result =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  return result.granted;
}