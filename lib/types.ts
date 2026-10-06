export type ImageStatus = "Ready" | "Waiting" | "Processing" | "Completed" | "Failed";
export type ResizeOptions = { width?: number; height?: number };
export type ConversionOptions = { quality: number; lossless: boolean; resize?: ResizeOptions };
export type ConversionResult = { filename: string; originalSize: number; outputSize: number; id: string; originalWidth: number; originalHeight: number; width: number; height: number };
export type SelectedImage = { id: string; file: File; preview: string; status: ImageStatus; error?: string; result?: ConversionResult };
export type PublicConfig = { quality: number; maxUploadMB: number; maxFiles: number; concurrency: number };
