const CLOUDINARY_CLOUD_NAME = "dtgfmscgz";
const CLOUDINARY_UPLOAD_PRESET = "mandro_shop";

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
  );

  if (!res.ok) {
    throw new Error("Upload lên Cloudinary thất bại");
  }

  const data = await res.json();
  return data.secure_url as string;
}

export const imagesApi = {
  upload: async (file: File): Promise<string> => {
    return uploadToCloudinary(file);
  },
  uploadMultiple: async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map((file) => uploadToCloudinary(file)));
  },
};