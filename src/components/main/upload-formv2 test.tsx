/* eslint-disable @next/next/no-img-element */
"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Upload,
  X,
  ImageIcon,
  Settings,
  Loader2,
  Trash2,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getBaseApi, getAccessToken } from "@/services/image-services";
import { toast } from "sonner";
import type { UploadResponse, UserPlanData } from "@/types/metadata";

export default function UploadForm() {
  // Core states
  const [files, setFiles] = useState<File[]>([]);
  const [tokens, setTokens] = useState<UserPlanData | null>(null);

  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [tabValue, setTabValue] = useState("upload");

  // Processing states
  const [loading, setLoading] = useState(false);
  const [uploadingStarted, setUploadingStarted] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const [progress, setProgress] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [processingTime, setProcessingTime] = useState(0);
  const [processingTimerId, setProcessingTimerId] =
    useState<NodeJS.Timeout | null>(null);

  // Dialog states
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [inSufficientTokenModal, setInSufficientTokenModal] = useState(false);

  // Result states
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [failedUploads, setFailedUploads] = useState<
    { filename: string; error: string }[]
  >([]);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);

  // XHR reference for cancellation
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings with local storage persistence
  const [settings, setSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("imageSeoSettings");
      return savedSettings
        ? JSON.parse(savedSettings)
        : {
            titleLength: 80,
            descriptionLength: 120,
            keywordCount: 45,
          };
    }
    return {
      titleLength: 80,
      descriptionLength: 120,
      keywordCount: 45,
    };
  });

  // Optimize progress updates with requestAnimationFrame
  const progressRef = useRef(0);

  // Fetch user tokens
  const fetchUserTokens = useCallback(async () => {
    try {
      setIsPending(true);
      const baseAPi = await getBaseApi();
      const accessToken = await getAccessToken();
      const response = await fetch(`${baseAPi}/users/tokens`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user tokens");
      }

      const data = await response.json();
      setTokens(data.data);
      return data.data;
    } catch (error) {
      console.error("Error fetching user tokens:", error);
      toast.error("Could not load available tokens");
    } finally {
      setIsPending(false);
    }
  }, []);

  // Fetch tokens on mount
  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  // Save settings to local storage
  useEffect(() => {
    localStorage.setItem("imageSeoSettings", JSON.stringify(settings));
  }, [settings]);

  // Handle page unload during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadInProgress) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploadInProgress]);

  // Derived state
  const hasInsufficientTokens = useMemo(() => {
    if (!tokens || files.length === 0) return false;
    return tokens.availableTokens < files.length;
  }, [tokens, files.length]);

  // Determine upload status for UI
  const uploadStatus = useMemo(() => {
    if (!uploadResponse) return "none";

    const totalFiles = files.length;
    const failedCount = failedUploads.length;

    if (failedCount === totalFiles) return "allFailed";
    if (failedCount > 0) return "partialSuccess";
    return "allSuccess";
  }, [uploadResponse, files.length, failedUploads.length]);

  // File management handlers
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const newFiles = Array.from(e.target.files).filter((file) =>
          file.type.startsWith("image/")
        );

        // Check if adding new files would exceed the 100 file limit
        if (files.length + newFiles.length > 100) {
          toast.error(
            "Maximum 100 images allowed. Please remove some files before adding more."
          );
          return;
        }

        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [files.length]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((files) => files.filter((_, i) => i !== index));
  }, []);

  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        const newFiles = Array.from(e.dataTransfer.files).filter((file) =>
          file.type.startsWith("image/")
        );

        // Check if adding new files would exceed the 100 file limit
        if (files.length + newFiles.length > 100) {
          toast.error(
            "Maximum 100 images allowed. Please remove some files before adding more."
          );
          return;
        }

        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [files.length]
  );

  // Click to open file dialog
  const triggerFileInput = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger if the click is directly on the container, not on its children
      if (e.target === e.currentTarget && fileInputRef.current) {
        fileInputRef.current.click();
      }
    },
    []
  );

  // Upload handlers
  const handleGenerateMore = useCallback(() => {
    setFiles([]);
    setShowModal(false);
    setUploadResponse(null);
    setProcessedCount(0);
    setProgress(0);
    setFailedUploads([]);
    setFailedFiles([]);
  }, []);

  const cancelUpload = useCallback(() => {
    // Abort the XHR request if it exists
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    setShowConfirmDialog(false);
    setShowModal(false);
    setLoading(false);
    setUploadingStarted(false);
    setUploadInProgress(false);
    toast.info("Upload process cancelled");
  }, []);

  const handleFileUpload = useCallback(
    async (formData: FormData, isRegeneration = false) => {
      try {
        const baseApi = await getBaseApi();
        const accessToken = await getAccessToken();

        // Create XHR for progress tracking
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr; // Store reference for cancellation

        xhr.open("POST", `${baseApi}/images/upload/multiple`, true);
        xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);

        xhr.timeout = 3600000;

        // Add connection test on long processes
        let processingStartTime = 0;
        xhr.onreadystatechange = () => {
          // When upload completes and server processing begins
          if (xhr.readyState === 4 && xhr.status === 200) {
            processingStartTime = Date.now();
          }
        };

        // Use requestAnimationFrame for smoother progress updates
        let rafId: number | null = null;
        let lastProgressUpdate = 0;

        // Update progress with animation frame for smoother UI
        const updateProgressWithRAF = () => {
          if (Math.abs(progressRef.current - progress) > 0.1) {
            setProgress(progressRef.current);
          }
          rafId = requestAnimationFrame(updateProgressWithRAF);
        };

        // Start the animation loop
        rafId = requestAnimationFrame(updateProgressWithRAF);

        // Track upload progress with optimized updates
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const now = Date.now();
            // Only calculate progress max once every 300ms to reduce overhead
            if (now - lastProgressUpdate > 300) {
              progressRef.current = Math.round(
                (event.loaded / event.total) * 100
              );
              lastProgressUpdate = now;
            }
          }
        };

        // Add periodic console log during long processing
        const processingInterval = setInterval(() => {
          if (
            processingStartTime > 0 &&
            progressRef.current >= 99 &&
            uploadInProgress
          ) {
            const processingTime = Math.round(
              (Date.now() - processingStartTime) / 1000
            );
            console.log(
              `Image processing in progress for ${processingTime} seconds`
            );
          }
        }, 10000);

        // Set up promise for completion
        const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
          // Add cleanup for interval and animation frame
          const cleanup = () => {
            clearInterval(processingInterval);
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          };

          const clearIntervalAndResolve = (response: UploadResponse) => {
            cleanup();
            resolve(response);
          };

          const clearIntervalAndReject = (error: Error) => {
            cleanup();
            reject(error);
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response: UploadResponse = JSON.parse(xhr.responseText);
                clearIntervalAndResolve(response);
              } catch (error: unknown) {
                // The server returned a response, but it's not valid JSON
                if (error instanceof Error) {
                  console.log(error.message);
                }
                if (xhr.responseText && xhr.responseText.length > 0) {
                  clearIntervalAndReject(
                    new Error(
                      "Invalid response format from server. The response was received but could not be processed."
                    )
                  );
                } else {
                  clearIntervalAndReject(
                    new Error("Failed to parse server response")
                  );
                }
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                if (
                  errorResponse.status === "error" &&
                  errorResponse.message === "invalid token"
                ) {
                  clearIntervalAndReject(
                    new Error(
                      "Authentication failed: Your session has expired. Please log in again."
                    )
                  );
                } else {
                  clearIntervalAndReject(
                    new Error(
                      errorResponse.message ||
                        `Server error: ${xhr.status} ${xhr.statusText}`
                    )
                  );
                }
              } catch {
                clearIntervalAndReject(
                  new Error(
                    `Server error: ${xhr.status || "unknown"} ${
                      xhr.statusText || "error"
                    }`
                  )
                );
              }
            }
          };

          xhr.onerror = () => {
            // Check if we actually received a response before showing connection error
            if (xhr.status === 0 && xhr.responseText === "") {
              clearIntervalAndReject(
                new Error(
                  "Server unavailable. Please check your internet connection and try again later."
                )
              );
            } else {
              // There was a response, but an error occurred during processing
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                clearIntervalAndReject(
                  new Error(
                    errorResponse.message ||
                      `Server error: ${xhr.status} ${xhr.statusText}`
                  )
                );
              } catch {
                // If parsing fails, provide generic error
                clearIntervalAndReject(
                  new Error(
                    `Server error: ${xhr.status || "unknown"} ${
                      xhr.statusText || "error"
                    }`
                  )
                );
              }
            }
          };

          xhr.onabort = () => {
            clearIntervalAndReject(new Error("Upload cancelled by user"));
          };
        });

        // Start the upload
        xhr.send(formData);

        // Wait for completion
        const response = await uploadPromise;

        // Ensure progress is 100% for UI consistency
        progressRef.current = 100;
        setProgress(100);

        // Process upload response
        if (isRegeneration) {
          // For regeneration, merge with existing data
          const previousSuccessfulImages =
            uploadResponse?.data.successfulImages || [];
          const newSuccessfulImages = response.data.successfulImages;

          const mergedResponse = {
            ...response,
            data: {
              ...response.data,
              successfulImages: [
                ...previousSuccessfulImages,
                ...newSuccessfulImages,
              ],
            },
          };

          setUploadResponse(mergedResponse);

          // Update successful uploads count (add to existing count)
          const previousSuccessCount =
            uploadResponse?.data.successfulImages.length || 0;
          const newSuccessCount = response.data.successfulImages.length;
          setProcessedCount(previousSuccessCount + newSuccessCount);
        } else {
          setUploadResponse(response);
          setProcessedCount(response.data.successfulImages.length);
        }

        // Process failed uploads
        if (
          response.data.failedImages &&
          response.data.failedImages.length > 0
        ) {
          setFailedUploads(response.data.failedImages);

          // Store failed files for potential regeneration
          const filesToRegenerate = isRegeneration ? failedFiles : files;
          const newFailedFiles = filesToRegenerate.filter((file) =>
            response.data.failedImages.some(
              (failed) => failed.filename === file.name
            )
          );
          setFailedFiles(newFailedFiles);
        } else {
          setFailedUploads([]);
          setFailedFiles([]);
        }

        xhrRef.current = null;
        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        // Don't set failed uploads if it was a user cancellation
        if (errorMessage !== "Upload cancelled by user") {
          setFailedUploads([
            {
              filename: isRegeneration ? "Batch regeneration" : "Batch upload",
              error: errorMessage,
            },
          ]);
        }

        xhrRef.current = null;
        throw error;
      }
    },
    [failedFiles, files, uploadResponse]
  );

  const regenerateFailedFiles = useCallback(async () => {
    if (failedFiles.length === 0) return;

    setIsRegenerating(true);
    setLoading(true);
    setUploadingStarted(true);
    setUploadInProgress(true);
    setProgress(0);

    // Use the failed files for regeneration
    const regenerateFiles = [...failedFiles];

    try {
      // Create FormData with failed files
      const formData = new FormData();

      // Append all failed files
      regenerateFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Add batch ID and settings
      formData.append("batchId", uploadResponse?.data.batchId ?? "");
      formData.append("titleLength", settings.titleLength.toString());
      formData.append(
        "descriptionLength",
        settings.descriptionLength.toString()
      );
      formData.append("keywordCount", settings.keywordCount.toString());
      formData.append("totalExpectedFiles", regenerateFiles.length.toString());
      formData.append("isRegeneration", "true");

      await handleFileUpload(formData, true);
      toast.success(
        `Successfully regenerated ${
          regenerateFiles.length - failedFiles.length
        } files`
      );
    } catch (error) {
      console.error("Error during regeneration:", error);
      if (
        error instanceof Error &&
        error.message !== "Upload cancelled by user"
      ) {
        toast.error("Failed to regenerate files");
        // Keep the failed files for potential retry
        setFailedFiles(regenerateFiles);
      }
    } finally {
      setLoading(false);
      setUploadingStarted(false);
      setUploadInProgress(false);
      setIsRegenerating(false);
    }
  }, [failedFiles, handleFileUpload, settings, uploadResponse?.data.batchId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (files.length === 0) {
        toast.error("Please upload at least one image");
        return;
      }

      // Check if user has enough tokens
      if (hasInsufficientTokens) {
        setInSufficientTokenModal(true);
        return;
      }

      // Setup UI state
      setLoading(true);
      setUploadingStarted(true);
      setShowModal(true);
      setProcessedCount(0);
      setProgress(0);
      setFailedUploads([]);
      setFailedFiles([]);
      setUploadInProgress(true);

      try {
        // Create FormData with all files and metadata
        const formData = new FormData();

        // Append all files
        files.forEach((file) => {
          formData.append("images", file);
        });

        // Append settings
        formData.append("titleLength", settings.titleLength.toString());
        formData.append(
          "descriptionLength",
          settings.descriptionLength.toString()
        );
        formData.append("keywordCount", settings.keywordCount.toString());
        formData.append("totalExpectedFiles", files.length.toString());

        await handleFileUpload(formData);
      } catch (error) {
        console.error("Error initiating upload:", error);
        if (
          error instanceof Error &&
          error.message !== "Upload cancelled by user"
        ) {
          toast.error("Upload failed. Please try again.");
        }
      } finally {
        setLoading(false);
        setUploadingStarted(false);
        setUploadInProgress(false);
      }
    },
    [files, handleFileUpload, hasInsufficientTokens, settings]
  );

  // Add processing time tracking with reduced update frequency
  useEffect(() => {
    if (processingTimerId) {
      clearInterval(processingTimerId);
      setProcessingTimerId(null);
    }

    if (progress === 100 && uploadInProgress) {
      // Use a longer interval (2 seconds) to reduce UI updates
      const timer = setInterval(() => {
        setProcessingTime((prev) => prev + 2);
      }, 2000);
      setProcessingTimerId(timer);
    } else if (!uploadInProgress) {
      setProcessingTime(0);
    }

    return () => {
      if (processingTimerId) {
        clearInterval(processingTimerId);
      }
    };
  }, [progress === 100, uploadInProgress]); // Simplified dependency array

  // Optimize file grid rendering with virtualization for large file sets
  const FileGridItem = React.memo(
    ({
      file,
      index,
      onRemove,
    }: {
      file: File;
      index: number;
      onRemove: (index: number) => void;
    }) => {
      // Use URL.createObjectURL once per component instance
      const [objectUrl, setObjectUrl] = useState<string>("");

      useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
      }, [file]);

      return (
        <div className="relative group">
          <div className="aspect-square rounded-md border bg-muted flex items-center justify-center overflow-hidden transition-all hover:shadow-md">
            <div className="relative w-full h-full">
              {file.type.startsWith("image/") ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={objectUrl || "/placeholder.svg"}
                    alt={file.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            aria-label={`Remove ${file.name}`}
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs mt-1 ellipsis-clamp" title={file.name}>
            {file.name}
          </p>
        </div>
      );
    }
  );
  FileGridItem.displayName = "FileGridItem";

  // Use the optimized FileGridItem in renderFileGrid
  const renderFileGrid = useCallback(() => {
    if (files.length === 0) return null;

    // Only render visible files to improve performance with large sets
    const maxVisibleItems = Math.min(files.length, 100);

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center">
            Selected Images
            <Badge variant="secondary" className="ml-2">
              {files.length}
            </Badge>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllFiles}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 max-h-96 overflow-y-auto overflow-x-hidden">
          {files.slice(0, maxVisibleItems).map((file, index) => (
            <FileGridItem
              key={`${file.name}-${index}`}
              file={file}
              index={index}
              onRemove={removeFile}
            />
          ))}
          {files.length > maxVisibleItems && (
            <div className="col-span-2 sm:col-span-3 md:col-span-6 text-center py-4 text-sm text-muted-foreground">
              {files.length - maxVisibleItems} more files not shown
            </div>
          )}
        </div>
      </div>
    );
  }, [files, clearAllFiles, removeFile]);

  const renderTokenInfo = useCallback(() => {
    if (!tokens) return null;

    return (
      <div className="mb-4 flex justify-center items-center -mt-4 text-muted-foreground">
        <div>
          <span className="text-sm font-medium">Tokens: </span>
          <span
            className={`text-sm ${
              hasInsufficientTokens ? "text-destructive" : "text-green-600"
            }`}
          >
            {files.length}
          </span>
          <span>/</span>
          <span
            className={`text-sm ${
              hasInsufficientTokens ? "text-destructive" : ""
            }`}
          >
            {tokens.availableTokens}
          </span>
        </div>
      </div>
    );
  }, [tokens, files.length, hasInsufficientTokens]);

  const renderErrorContent = useCallback(() => {
    let errorMessage = "An unknown error occurred";
    let errorIcon = <AlertCircle className="h-8 w-8 text-destructive" />;

    // Extract error message from failed uploads
    if (failedUploads.length > 0) {
      errorMessage = failedUploads[0].error;

      // Check for specific error types
      if (
        errorMessage.includes("invalid token") ||
        errorMessage.includes("Authentication failed")
      ) {
        errorMessage = "Your session has expired. Please log in again.";
        errorIcon = <XCircle className="h-8 w-8 text-destructive" />;
      } else if (
        errorMessage.includes("Server unavailable") ||
        errorMessage.includes("internet connection")
      ) {
        errorIcon = <AlertTriangle className="h-8 w-8 text-amber-500" />;
      }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-full bg-red-100 p-3 w-16 h-16 mx-auto flex items-center justify-center">
          {errorIcon}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Processing Failed
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }, [failedUploads]);

  // Extract the ProcessingIndicator as a memoized component to prevent unnecessary re-renders
  const ProcessingIndicator = React.memo(({ time }: { time: number }) => {
    if (time <= 30) return null;

    return (
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Processing is taking longer than usual. Please keep this window open.
          {time > 120 && (
            <span> Large batches may take several minutes to complete.</span>
          )}
        </p>
      </div>
    );
  });
  ProcessingIndicator.displayName = "ProcessingIndicator";

  // Create a pure CSS spinner component that doesn't rely on state updates
  const CSSSpinner = React.memo(() => (
    <div className="spinner-container">
      <style jsx>{`
        .spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #ccc;
          border-top-color: hsl(var(--primary));
          border-radius: 50%;
          animation: spinner 0.8s linear infinite;
        }
        @keyframes spinner {
          to {
            transform: rotate(360deg);
          }
        }
        .bounce-dots {
          display: flex;
          margin-top: 16px;
        }
        .dot {
          width: 8px;
          height: 8px;
          margin: 0 4px;
          background: hsl(var(--primary));
          border-radius: 50%;
        }
        .dot:nth-child(1) {
          animation: bounce 1.2s infinite 0ms;
        }
        .dot:nth-child(2) {
          animation: bounce 1.2s infinite 150ms;
        }
        .dot:nth-child(3) {
          animation: bounce 1.2s infinite 300ms;
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
      <div className="spinner"></div>
    </div>
  ));
  CSSSpinner.displayName = "CSSSpinner";

  // Create a pure CSS bounce animation that doesn't rely on state updates
  const BounceDots = React.memo(() => (
    <div className="flex items-center justify-center mt-2 text-primary">
      <style jsx>{`
        .bounce-dots {
          display: flex;
        }
        .dot {
          width: 8px;
          height: 8px;
          margin: 0 4px;
          background: hsl(var(--primary));
          border-radius: 50%;
        }
        .dot:nth-child(1) {
          animation: bounce 1.2s infinite 0ms;
        }
        .dot:nth-child(2) {
          animation: bounce 1.2s infinite 150ms;
        }
        .dot:nth-child(3) {
          animation: bounce 1.2s infinite 300ms;
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
      <div className="bounce-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <span className="ml-2 text-sm">Generating metadata...</span>
    </div>
  ));
  BounceDots.displayName = "BounceDots";

  const renderProcessingContent = useCallback(() => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          {/* Improved loading spinner with smoother animation */}
          <div className="w-12 h-12 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin duration-1000"></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>

          {/* Improved progress bar with smoother transition */}
          <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {progress === 100 && uploadInProgress ? (
            <div className="flex items-center justify-center mt-2 text-primary">
              {/* Improved bouncing dots with staggered animations */}
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 bg-primary rounded-full"
                    style={{
                      animation: "bounce 1.4s infinite ease-in-out",
                      animationDelay: `${i * 150}ms`,
                      animationFillMode: "both",
                    }}
                  ></div>
                ))}
              </div>
              <span className="ml-2 text-sm">Generating metadata...</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm mt-2">
              {uploadingStarted ? (
                <span>
                  {isRegenerating ? "Regenerating" : "Uploading"} files{" "}
                  {Math.min(progress, 100)}% complete
                </span>
              ) : (
                <span>
                  Processed: {processedCount} of{" "}
                  {isRegenerating
                    ? (uploadResponse?.data.successfulImages.length || 0) +
                      failedFiles.length
                    : files.length}
                </span>
              )}
              {failedUploads.length > 0 && (
                <span className="text-destructive">
                  Failed: {failedUploads.length}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {uploadingStarted
              ? isRegenerating
                ? "Regenerating failed files..."
                : progress === 100
                ? "Upload complete, generating SEO metadata..."
                : "Uploading files to server..."
              : "Analyzing images and generating SEO metadata"}
          </h4>
          <p className="text-xs text-muted-foreground">
            This process may take several minutes for large batches
          </p>
        </div>
      </div>
    );
  }, [
    progress,
    uploadInProgress,
    uploadingStarted,
    processedCount,
    isRegenerating,
    uploadResponse?.data?.successfulImages?.length,
    failedFiles.length,
    failedUploads.length,
    files.length,
  ]);

  const renderCompletionContent = useCallback(() => {
    // Determine icon and message based on upload status
    let icon = <CheckCircle2 className="h-8 w-8 text-green-600" />;
    let statusColor = "bg-green-100";
    let statusText = "Processing complete!";
    let statusTextColor = "text-green-600";

    if (uploadStatus === "allFailed") {
      icon = <XCircle className="h-8 w-8 text-destructive" />;
      statusColor = "bg-red-100";
      statusText = "Processing failed";
      statusTextColor = "text-destructive";
    } else if (uploadStatus === "partialSuccess") {
      icon = <AlertTriangle className="h-8 w-8 text-amber-500" />;
      statusColor = "bg-amber-100";
      statusText = "Partially completed";
      statusTextColor = "text-amber-600";
    }

    return (
      <div className="space-y-4">
        <div
          className={`rounded-full ${statusColor} p-3 w-16 h-16 mx-auto flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="text-center">
          <p className={`text-lg font-semibold ${statusTextColor}`}>
            {statusText}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {uploadResponse ? (
              <>
                {uploadResponse.data.successfulImages.length} of {files.length}{" "}
                images processed successfully
              </>
            ) : (
              <>
                {processedCount} of {files.length} images processed successfully
              </>
            )}
          </p>
          {failedUploads.length > 0 && (
            <p className="mt-1 text-sm text-destructive">
              {failedUploads.length} uploads failed
            </p>
          )}
          {uploadResponse && (
            <div className="mt-4 p-2 bg-primary/5 rounded-md">
              <div className="flex justify-between items-center">
                <p className="text-sm">
                  <span className="font-medium">Remaining tokens:</span>{" "}
                  {uploadResponse.data.remainingTokens}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center"
                >
                  {showDetails ? "Hide" : "Show"} details
                  <ChevronRight
                    className={`ml-1 h-4 w-4 transition-transform ${
                      showDetails ? "rotate-90" : ""
                    }`}
                  />
                </Button>
              </div>

              {showDetails && (
                <div className="mt-2 space-y-2 text-left">
                  <p className="text-xs">
                    <span className="font-medium">Batch ID:</span>{" "}
                    {uploadResponse.data.batchId}
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Status:</span>{" "}
                    <Badge
                      variant={
                        uploadStatus === "allSuccess" ? "default" : "outline"
                      }
                      className={`ml-1 ${
                        uploadStatus === "allFailed"
                          ? "border-destructive text-destructive"
                          : uploadStatus === "partialSuccess"
                          ? "border-amber-500 text-amber-500"
                          : ""
                      }`}
                    >
                      {uploadStatus === "allSuccess"
                        ? "Complete"
                        : uploadStatus === "partialSuccess"
                        ? "Partial Success"
                        : "Failed"}
                    </Badge>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [
    uploadResponse,
    files.length,
    processedCount,
    failedUploads.length,
    showDetails,
    uploadStatus,
  ]);

  const renderFailedUploads = useCallback(() => {
    if (failedUploads.length === 0) return null;

    return (
      <div className="border-t pt-4 mt-2">
        <h4 className="text-sm font-medium mb-2">Failed Uploads:</h4>
        <div className="max-h-32 overflow-y-auto text-sm">
          {failedUploads.map((fail, index) => (
            <div
              key={index}
              className="py-1 border-b border-gray-100 last:border-0"
            >
              <p
                className="font-medium ellipsis-clamp mb-1"
                title={fail.filename}
              >
                {fail.filename}
              </p>
              <p className="text-xs text-destructive break-words">
                {fail.error}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }, [failedUploads]);

  return (
    <div className="">
      {/* Token info */}
      {renderTokenInfo()}
      {/* Loading state */}
      {isPending && (
        <div className="flex justify-center items-center mb-4 -mt-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <Tabs
          defaultValue="upload"
          className="w-full"
          value={tabValue}
          onValueChange={setTabValue}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Images</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                {/* Drag and drop area */}
                <div
                  className={`border-2 border-dashed rounded-lg text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={(e) => triggerFileInput(e)}
                >
                  <div className="flex relative flex-col items-center justify-center gap-4 p-8">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        Drag and drop your images here
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse from your device
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      multiple
                      className="sr-only"
                      id="file-upload"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => e.stopPropagation()} // Stop propagation to prevent double triggering
                    >
                      Select Images
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, JPEG, PNG
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max image size 45MB. Max 100 images per batch.
                    </p>
                  </div>
                </div>

                {/* File grid */}
                {renderFileGrid()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Metadata Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure how your SEO metadata will be generated
                    </p>
                  </div>
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="title-length">Title Length</Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.titleLength} characters
                      </span>
                    </div>
                    <Slider
                      id="title-length"
                      min={30}
                      max={150}
                      step={1}
                      value={[settings.titleLength]}
                      onValueChange={(value) =>
                        setSettings({ ...settings, titleLength: value[0] })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 50-60 characters for optimal display in
                      search results
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="description-length">
                        Description Length
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.descriptionLength} characters
                      </span>
                    </div>
                    <Slider
                      id="description-length"
                      min={50}
                      max={250}
                      step={1}
                      value={[settings.descriptionLength]}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          descriptionLength: value[0],
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 150-160 characters for optimal display in
                      search results
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="keyword-count">Keyword Count</Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.keywordCount} keywords
                      </span>
                    </div>
                    <Slider
                      id="keyword-count"
                      min={10}
                      max={50}
                      step={1}
                      value={[settings.keywordCount]}
                      onValueChange={(value) =>
                        setSettings({ ...settings, keywordCount: value[0] })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 20-30 keywords for a balanced approach
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="mt-6 flex justify-center">
          <Button
            type="submit"
            disabled={files.length === 0 || loading || isPending}
            className="px-12 h-11"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating SEO Metadata
              </>
            ) : (
              "Generate SEO Metadata"
            )}
          </Button>
        </div>

        {/* Processing AlertDialog */}
        <AlertDialog
          open={showModal}
          onOpenChange={(open) => {
            // If trying to close and still loading, show confirmation dialog
            if (!open && uploadInProgress) {
              setShowConfirmDialog(true);
            } else if (!uploadInProgress) {
              // Only allow closing if not loading
              setShowModal(open);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex justify-between items-center">
                <AlertDialogTitle>
                  {uploadInProgress
                    ? "Processing Images"
                    : uploadStatus === "allSuccess"
                    ? "Upload Complete"
                    : uploadStatus === "partialSuccess"
                    ? "Partially Completed"
                    : failedUploads.length > 0 &&
                      failedUploads[0].error.includes("Server unavailable")
                    ? "Server Unavailable"
                    : failedUploads.length > 0 &&
                      (failedUploads[0].error.includes("invalid token") ||
                        failedUploads[0].error.includes("Authentication"))
                    ? "Authentication Error"
                    : "Upload Failed"}
                </AlertDialogTitle>
                {!uploadInProgress && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-full p-1 transition-colors bg-destructive/10"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                )}
              </div>
            </AlertDialogHeader>
            <div className="py-4">
              {uploadInProgress
                ? renderProcessingContent()
                : uploadStatus === "allSuccess" ||
                  uploadStatus === "partialSuccess"
                ? renderCompletionContent()
                : renderErrorContent()}
            </div>

            {/* Failed uploads section - only show detailed failures if not a token/server error */}
            {!uploadInProgress &&
              uploadStatus !== "allSuccess" &&
              !failedUploads.some(
                (f) =>
                  f.error.includes("invalid token") ||
                  f.error.includes("Authentication") ||
                  f.error.includes("Server unavailable")
              ) &&
              renderFailedUploads()}

            {uploadInProgress ? (
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="text-destructive border-destructive hover:text-destructive/90"
                  onClick={() => setShowConfirmDialog(true)}
                >
                  Cancel Upload
                </AlertDialogCancel>
              </AlertDialogFooter>
            ) : (
              <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                {failedUploads.length > 0 &&
                  !failedUploads.some(
                    (f) =>
                      f.error.includes("invalid token") ||
                      f.error.includes("Authentication") ||
                      f.error.includes("Server unavailable")
                  ) && (
                    <Button
                      variant="secondary"
                      onClick={regenerateFailedFiles}
                      className="sm:flex-1"
                      disabled={isRegenerating}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Failed Files
                    </Button>
                  )}

                {/* For authentication errors, provide a login button */}
                {failedUploads.some(
                  (f) =>
                    f.error.includes("invalid token") ||
                    f.error.includes("Authentication")
                ) && (
                  <Button type="button" asChild className="sm:flex-1">
                    <Link href="/login">Log In Again</Link>
                  </Button>
                )}

                {/* For server unavailable errors, provide a retry button */}
                {failedUploads.some((f) =>
                  f.error.includes("Server unavailable")
                ) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setFailedUploads([]);
                    }}
                    className="sm:flex-1"
                  >
                    Try Again Later
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleGenerateMore}
                  className="sm:flex-1"
                >
                  Process More Images
                </Button>

                {uploadStatus !== "allFailed" && (
                  <Button type="button" asChild className="sm:flex-1">
                    <Link href="/results">View Results</Link>
                  </Button>
                )}
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Confirmation AlertDialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Processing?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to cancel the current upload? This will stop
              processing your images.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>No, continue processing</AlertDialogCancel>
              <AlertDialogAction
                onClick={cancelUpload}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, cancel upload
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Insufficient Tokens Dialog */}
        <Dialog
          open={inSufficientTokenModal}
          onOpenChange={setInSufficientTokenModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Not Enough Tokens</DialogTitle>
              <DialogDescription>
                You don&apos;t have enough tokens to process all your images.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center mb-4 text-amber-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p className="font-medium">Token Shortage</p>
              </div>
              <p>
                You need {files.length} tokens to process these images, but you
                only have {tokens?.availableTokens || 0} tokens available.
              </p>
              <p className="mt-4">
                Please upgrade your plan to get more tokens and continue
                processing your images.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInSufficientTokenModal(false)}
              >
                Cancel
              </Button>
              <Button asChild>
                <Link href="/pricing">Upgrade Plan</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </div>
  );
}
