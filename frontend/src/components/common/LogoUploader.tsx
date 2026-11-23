import { useState } from 'react';
import { FileInput } from '@astryxdesign/core/FileInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '../../api/client';
import { uploadLogoFile } from '../../api/locations';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

interface LogoUploaderProps {
  label?: string;
  description?: string;
  currentLogoUrl?: string | null;
  onUploaded: (url: string | null) => void;
}

/**
 * Emlak ofisi logosu yükleme bileşeni.
 * Kabul edilen formatlar: PNG, JPG/JPEG, WEBP · Maksimum 5 MB.
 */
export function LogoUploader({
  label = 'Emlak Ofisi Logosu',
  description = 'PNG, JPG veya WEBP · Maksimum 5 MB. Yüklenmezse kurumsal varsayılan logo otomatik atanır.',
  currentLogoUrl,
  onUploaded,
}: LogoUploaderProps) {
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

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      const msg = 'Yalnızca PNG, JPG/JPEG veya WEBP formatında görsel yükleyebilirsiniz.';
      setErrorMsg(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      const msg = `Dosya boyutu maksimum 5 MB olabilir (Seçilen: ${mb} MB).`;
      setErrorMsg(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    try {
      const result = await uploadLogoFile(file);
      onUploaded(result.url);
      showToast({ body: 'Ofis logosu yüklendi.', type: 'info' });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Logo yüklenirken hata oluştu.';
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
        maxSize={MAX_LOGO_SIZE_BYTES}
        value={selectedFile}
        isLoading={isUploading}
        placeholder="Logo dosyasını sürükleyin veya seçin (PNG, JPG, WEBP · Max 5 MB)"
        onChange={(files) => void handleFileChange(files)}
        status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
        width="100%"
      />

      {currentLogoUrl && (
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Thumbnail
            src={currentLogoUrl}
            alt="Emlak Ofisi Logosu"
            label={selectedFile?.name ?? 'Aktif Ofis Logosu'}
            showRemoveOn="always"
            onRemove={() => {
              setSelectedFile(null);
              setErrorMsg(null);
              onUploaded(null);
            }}
          />
          <VStack gap={0.5}>
            <Text weight="medium" size="sm">
              {selectedFile ? selectedFile.name : 'Aktif Kurumsal Logo'}
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
