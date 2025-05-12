import { ChangeEvent, useRef, useState } from "react";

/**
 *
 * @param maxSize
 *
 * Custom hooks for fileInput
 */
export const useFileInput = (maxSize: number) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file input change
   * @param e
   * @returns
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    // checking if files exist
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];

      // if file size is greater than maxsize, exit out of the func.
      if (selectedFile.size > maxSize) return;

      // telling browser not to keep the reference to this file any longer cause we are done with preview and have access to the actual file
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setFile(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);

      if (selectedFile.type.startsWith("video")) {
        const video = document.createElement("video");

        video.preload = "metadata";

        video.onloadedmetadata = () => {
          if (isFinite(video.duration) && video.duration > 0) {
            setDuration(Math.round(video.duration));
          } else {
            setDuration(0);
          }

          URL.revokeObjectURL(video.src);
        };

        video.src = objectUrl;
      }
    }
  };

  /**
   * Reset the file input
   */
  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl("");
    setDuration(0);

    if (inputRef.current) inputRef.current.value = "";
  };

  return { file, previewUrl, duration, inputRef, handleFileChange, resetFile };
};
