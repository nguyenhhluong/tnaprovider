import { useState } from "react";
import type { ProgressPhoto } from "../../types/progress";
import { Eye, EyeOff, ImageOff } from "lucide-react";

interface ProgressPhotoFeedProps {
  photos: ProgressPhoto[];
  onToggleVisibility?: (id: string, visible: boolean) => void;
  showVisibilityToggle?: boolean;
}

function PhotoImage({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !url) {
    return (
      <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <ImageOff className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="w-full aspect-video object-cover rounded-lg"
      onError={() => setError(true)}
    />
  );
}

export function ProgressPhotoFeed({ photos, onToggleVisibility, showVisibilityToggle }: ProgressPhotoFeedProps) {
  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No progress photos yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <PhotoImage url={photo.imageUrl} alt={`Progress photo - ${photo.stage}`} />
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium capitalize">{photo.stage}</span>
              <span className="text-xs text-gray-500">
                {new Date(photo.date).toLocaleDateString("en-AU")}
              </span>
            </div>
            {photo.note && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{photo.note}</p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{photo.uploadedBy}</span>
              {showVisibilityToggle && onToggleVisibility && (
                <button
                  onClick={() => onToggleVisibility(photo.id, !photo.visibleToClient)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                    photo.visibleToClient
                      ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                      : "text-gray-500 bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  {photo.visibleToClient ? (
                    <><Eye className="w-3 h-3" /> Client</>
                  ) : (
                    <><EyeOff className="w-3 h-3" /> Hidden</>
                  )}
                </button>
              )}
              {!showVisibilityToggle && photo.visibleToClient && (
                <span className="flex items-center gap-1 text-green-600">
                  <Eye className="w-3 h-3" /> Visible to client
                </span>
              )}
              {!showVisibilityToggle && !photo.visibleToClient && (
                <span className="flex items-center gap-1 text-gray-400">
                  <EyeOff className="w-3 h-3" /> Internal only
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
