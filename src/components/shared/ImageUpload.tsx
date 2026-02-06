import { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface ImageUploadProps {
    currentImageUrl?: string;
    onImageUploaded: (url: string) => void;
    bucketName?: string;
}

export function ImageUpload({ currentImageUrl, onImageUploaded, bucketName = 'product-images' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            setPreviewUrl(publicUrl);
            onImageUploaded(publicUrl);
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(null);
        onImageUploaded('');
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>

            {!previewUrl ? (
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            )}
                            <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">{uploading ? 'Uploading...' : 'Click to upload'}</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG or WEBP</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </label>
                </div>
            ) : (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                    <img
                        src={previewUrl}
                        alt="Product preview"
                        className="w-full h-full object-contain"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 hover:bg-white shadow-sm transition opacity-0 group-hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
