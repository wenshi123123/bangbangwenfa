'use client';

// ============================================
// ⚠️ 预览模式开关 - 上传功能已启用
// ============================================
const PREVIEW_MODE = false;

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { LawyerFormData } from './lawyer-join-wizard';
import Image from 'next/image';

interface LawyerUploadStepProps {
  formData: LawyerFormData;
  onUpdate: (updates: Partial<LawyerFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface UploadSection {
  key: keyof Pick<LawyerFormData, 'licenseImages' | 'idCardImages' | 'educationImages'>;
  title: string;
  description: string;
  required: boolean;
  maxImages: number;
}

const uploadSections: UploadSection[] = [
  {
    key: 'licenseImages',
    title: '律师执业证',
    description: '执业信息与年度考核页照片',
    required: true,
    maxImages: 2,
  },
  {
    key: 'idCardImages',
    title: '身份证照片',
    description: '手持身份证自拍 + 正反面',
    required: true,
    maxImages: 3,
  },
  {
    key: 'educationImages',
    title: '学历证明',
    description: '毕业证/学位证照片',
    required: true,
    maxImages: 1,
  },
];

export function LawyerUploadStep({ formData, onUpdate, onNext, onBack }: LawyerUploadStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const section = uploadSections.find(s => s.key === key);
    if (!section) return;

    const currentImages = formData[section.key] as string[];
    if (currentImages.length >= section.maxImages) {
      alert(`最多只能上传${section.maxImages}张图片`);
      return;
    }

    setUploading(key);

    // ============================================
    // ⚠️ 预览模式：跳过实际上传，直接模拟成功
    // ============================================
    if (PREVIEW_MODE) {
      try {
        const fileArray = Array.from(files);
        const remainingSlots = section.maxImages - currentImages.length;
        const filesToUpload = fileArray.slice(0, remainingSlots);

        const mockUrls: string[] = [];
        for (const file of filesToUpload) {
          // 创建本地预览URL（仅用于预览）
          const mockUrl = URL.createObjectURL(file);
          mockUrls.push(mockUrl);
        }

        if (mockUrls.length > 0) {
          onUpdate({
            [key]: [...currentImages, ...mockUrls],
          });
        }
      } catch (error) {
        console.error('Preview mode error:', error);
      } finally {
        setUploading(null);
      }
      return;
    }

    try {
      const fileArray = Array.from(files);
      const remainingSlots = section.maxImages - currentImages.length;
      const filesToUpload = fileArray.slice(0, remainingSlots);

      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          alert('请上传图片文件');
          continue;
        }

        // 验证文件大小（最大5MB）
        if (file.size > 5 * 1024 * 1024) {
          alert('图片大小不能超过5MB');
          continue;
        }

        // 调用上传API（携带认证token）
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', key);
        formData.append('folder', 'lawyer');

        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/lawyer/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          uploadedUrls.push(result.url);
        } else {
          console.error('Upload failed:', result.error);
          alert(`上传失败: ${result.error}`);
        }
      }

      if (uploadedUrls.length > 0) {
        onUpdate({
          [key]: [...currentImages, ...uploadedUrls],
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (key: string, index: number) => {
    const section = uploadSections.find(s => s.key === key);
    if (!section) return;

    const currentImages = formData[section.key] as string[];
    const newImages = currentImages.filter((_, i) => i !== index);
    onUpdate({
      [key]: newImages,
    });
  };

  const isFormValid = () => {
    // ============================================
    // ⚠️ 预览模式：跳过验证，直接放行
    // ============================================
    if (PREVIEW_MODE) {
      return true;
    }

    return (
      formData.licenseImages.length >= 1 &&
      formData.idCardImages.length >= 1 &&
      formData.educationImages.length >= 1
    );
  };

  const getProgressText = (section: UploadSection) => {
    const current = formData[section.key] as string[];
    return `${current.length}/${section.maxImages}`;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-50 border border-green-100 mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-green-700">Step 2 / 3</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          上传资质材料
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          请上传清晰、完整的资质证明材料
        </p>
      </div>

      {/* Upload Sections */}
      <div className="space-y-6 mb-6">
        {uploadSections.map((section) => {
          const currentImages = formData[section.key] as string[];
          const isUploadingThis = uploading === section.key;

          return (
            <div key={section.key} className="border border-border rounded-xl p-4 bg-card">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {section.title}
                    {section.required && <span className="text-red-500 text-sm">*</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {getProgressText(section)}
                </span>
              </div>

              {/* Upload Area */}
              <div className="grid grid-cols-3 gap-3">
                {/* Existing Images */}
                {currentImages.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    {/* 预览模式使用普通 img，生产环境使用 Next.js Image */}
                    {PREVIEW_MODE ? (
                      <img
                        src={url}
                        alt={`${section.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={url}
                        alt={`${section.title} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveImage(section.key, index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                {currentImages.length < section.maxImages && (
                  <label
                    className={`
                      aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                      ${isUploadingThis
                        ? 'border-green-400 bg-green-50'
                        : 'border-border hover:border-green-400 hover:bg-green-50/50'
                      }
                    `}
                  >
                    <input
                      ref={(el) => { fileInputsRef.current[section.key] = el; }}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(section.key, e.target.files)}
                      className="hidden"
                      disabled={isUploadingThis}
                    />
                    {isUploadingThis ? (
                      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">点击上传</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Format Hint */}
              <p className="text-xs text-muted-foreground mt-2">
                支持 JPG、PNG 格式，单张不超过 5MB
              </p>
            </div>
          );
        })}
      </div>

      {/* Notice */}
      <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">注意事项</p>
            <p className="text-xs text-amber-700">
              请确保上传的材料清晰可辨，信息真实有效。上传虚假材料将导致入驻申请被拒绝。
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border-2 border-border bg-card hover:bg-muted transition-all duration-300"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={!isFormValid()}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300
            ${isFormValid()
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          下一步，选择套餐
        </button>
      </div>
    </div>
  );
}
