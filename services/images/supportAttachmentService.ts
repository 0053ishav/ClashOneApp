import * as FileSystem from "expo-file-system/legacy";

export async function convertImagesToBase64(
  uris: string[]
) {
  return Promise.all(
    uris.map(async (uri, index) => {
      const base64 =
        await FileSystem.readAsStringAsync(uri, {
          encoding:
            FileSystem.EncodingType.Base64,
        });

      return {
        filename: `screenshot-${index + 1}.jpg`,
        content: base64,
      };
    })
  );
}