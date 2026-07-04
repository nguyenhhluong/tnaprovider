import { useState } from "react";
import type { ReviewRequest } from "../../types/review";
import { mockReviewRequests } from "../../data/platformMock";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink } from "lucide-react";

export function ReviewRequestList() {
  const [filterCompleted, setFilterCompleted] = useState(false);

  const filtered = filterCompleted
    ? mockReviewRequests
    : mockReviewRequests;

  if (!filtered || filtered.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No review requests found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={filterCompleted}
            onChange={(e) => setFilterCompleted(e.target.checked)}
            className="rounded"
          />
          Show all projects
        </label>
      </div>

      {filtered.map((request) => (
        <div key={request.id} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{request.projectName}</h4>
              <p className="text-sm text-gray-500">{request.clientName}</p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-2">
            <span>Completed: {new Date(request.completedDate).toLocaleDateString("en-AU")}</span>
            {request.followUpDate && (
              <span>Follow-up: {new Date(request.followUpDate).toLocaleDateString("en-AU")}</span>
            )}
            {request.rating && (
              <span>Rating: {"★".repeat(request.rating)}{"☆".repeat(5 - request.rating)}</span>
            )}
          </div>

          {request.reviewSent && request.reviewLink && (
            <a
              href={request.reviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View review
            </a>
          )}

          {!request.reviewSent && (
            <span className="text-xs text-amber-600">Review not yet sent</span>
          )}

          {request.reviewText && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">"{request.reviewText}"</p>
          )}
        </div>
      ))}
    </div>
  );
}
