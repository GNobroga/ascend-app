export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export const MAX_IMAGE_SIZE_MB = 5;

export const imageFileError = (file: File) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `“${file.name}” não é uma imagem aceita. Use JPEG, PNG, WebP, AVIF ou GIF.`;
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `“${file.name}” tem mais de ${MAX_IMAGE_SIZE_MB} MB.`;
  }
  return null;
};
