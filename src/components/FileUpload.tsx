import { useState, useRef } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";

interface FileUploadProps {
  onUpload: (result: any, previewUrls?: string[]) => void;
  onError?: (error: string) => void;
  type?: "artwork" | "avatar" | "blog" | "general";
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
  children?: React.ReactNode;
}

export default function FileUpload({
  onUpload,
  onError,
  type = "general",
  accept = "image/*",
  multiple = false,
  maxSize = 10,
  className = "",
  children
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('authToken');
  const API_BASE = apiUrl('/api/upload');

  const isAcceptedFile = (file: File) => {
    if (!accept) {
      return true;
    }

    const acceptedTypes = accept
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (acceptedTypes.length === 0) {
      return true;
    }

    return acceptedTypes.some((acceptedType) => {
      if (acceptedType === "*/*") {
        return true;
      }

      if (acceptedType.endsWith("/*")) {
        return file.type.toLowerCase().startsWith(acceptedType.replace("*", ""));
      }

      return file.type.toLowerCase() === acceptedType;
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const fileArray = Array.from(files);
      const previewUrls = fileArray.map((file) => URL.createObjectURL(file));
      
      for (const file of fileArray) {
        if (!isAcceptedFile(file)) {
          throw new Error(`Invalid file type for ${file.name}. Please upload JPEG, PNG, WebP, or GIF images.`);
        }

        if (file.size > maxSize * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds ${maxSize}MB limit`);
        }
      }

      const formData = new FormData();
      
      if (multiple) {
        fileArray.forEach(file => {
          formData.append('files', file);
        });
        formData.append('type', type);
        formData.append('optimize', 'true');
        formData.append('cloudinary', 'true');
        
        const response = await fetch(`${API_BASE}/multiple`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          onUpload(data.data, previewUrls);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } else {
        const file = fileArray[0];
        formData.append('file', file);
        formData.append('type', type);
        formData.append('optimize', 'true');
        formData.append('cloudinary', 'true');

        const response = await fetch(`${API_BASE}/single`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          onUpload(data.data, previewUrls);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      const message = getNetworkErrorMessage(error, 'Upload failed');
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
    setErrorMessage(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClick = () => {
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative cursor-pointer transition-all duration-200 ${
          errorMessage
            ? 'rounded-lg ring-1 ring-red-300 bg-red-50/40'
            : dragOver 
              ? 'rounded-lg ring-1 ring-[#c8a830] bg-[#c8a830]/5' 
              : 'rounded-lg hover:bg-black/[0.015]'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {children || (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {uploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8a830] mx-auto"></div>
                <p className="text-sm text-gray-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Uploading...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-400">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
                </p>
                <p className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Max {maxSize}MB • {accept.replace('/*', '').toUpperCase()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-2 text-sm text-red-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
