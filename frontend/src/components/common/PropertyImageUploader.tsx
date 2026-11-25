import { useState } from 'react';
import { FileInput } from '@astryxdesign/core/FileInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '../../api/client';
import { uploadPropertyImageFile } from '../../api/properties';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

interface PropertyImageUploaderProps {
  label?: string;
  description?: string;
  currentImageUrl?: string | null;
  onUploaded: (url: string | null) => void;
}

/**
 * Gayrimenkul ilan görseli yükleme bileşeni.
 * Kabul edilen formatlar: PNG, JPG/JPEG, WEBP · Maksimum 5 MB.
 */
export function PropertyImageUploader({
  label = 'İlan Görseli',
  description = 'PNG, JPG veya WEBP · Maksimum 5 MB. Yüklenmezse kurumsal varsayılan görsel atanır.',
  currentImageUrl,
  onUploaded,
}: PropertyImageUploaderProps) {
  const showToast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (files: File | File[] | null) => {
    const file = Array.isArray(files) ? files[0] ?? null : files;
    setErrorMsg(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      const msg =
        'Yalnızca PNG, JPG/JPEG veya WEBP formatında görsel yükleyebilirsiniz.';
      setErrorMsg(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      const msg = `Dosya boyutu maksimum 5 MB olabilir (Seçilen: ${mb} MB).`;
      setErrorMsg(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    try {
      const result = await uploadPropertyImageFile(file);
      onUploaded(result.url);
      showToast({ body: result.message, type: 'info' });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'İlan görseli yüklenirken hata oluştu.';
      setErrorMsg(msg);
      setSelectedFile(null);
      showToast({ body: msg, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <VStack gap={2}>
      <FileInput
        mode="dropzone"
        label={label}
        description={description}
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        maxSize={MAX_IMAGE_SIZE_BYTES}
        value={selectedFile}
        isLoading={isUploading}
        placeholder="İlan fotoğrafını sürükleyin veya seçin (PNG, JPG, WEBP · Max 5 MB)"
        onChange={(files) => void handleFileChange(files)}
        status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
        width="100%"
      />

      {currentImageUrl && (
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Thumbnail
            src={currentImageUrl}
            alt="Gayrimenkul İlan Görseli"
            label={selectedFile?.name ?? 'Aktif İlan Görseli'}
            showRemoveOn="always"
            onRemove={() => {
              setSelectedFile(null);
              setErrorMsg(null);
              onUploaded(null);
            }}
          />
          <VStack gap={0.5}>
            <Text weight="medium" size="sm">
              {selectedFile ? selectedFile.name : 'Aktif İlan Görseli'}
            </Text>
            <Text color="secondary" size="sm">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(0)} KB · Yüklendi`
                : 'Önizleme üzerinden kaldırıp değiştirebilirsiniz'}
            </Text>
          </VStack>
        </HStack>
      )}
    </VStack>
  );
}
