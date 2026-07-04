import { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = "Before",
  afterLabel = "After",
  alt = "Before and after comparison",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    updatePosition(e.touches[0].clientX);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/10] overflow-hidden rounded-xl select-none cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* After image (full width, shown on the right) */}
        <img
          src={afterImageUrl}
          alt={`${alt} - ${afterLabel}`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          loading="lazy"
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImageUrl}
            alt={`${alt} - ${beforeLabel}`}
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-md pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand-dark">
              <path d="M6 3L2 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 3L14 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div
          className="absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-black/60 text-white pointer-events-none"
          style={{ opacity: sliderPosition > 15 ? 1 : 0 }}
        >
          {beforeLabel}
        </div>
        <div
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-black/60 text-white pointer-events-none"
          style={{ opacity: sliderPosition < 85 ? 1 : 0 }}
        >
          {afterLabel}
        </div>

        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleRangeChange}
          className="sr-only"
          aria-label="Before and after comparison slider"
          tabIndex={0}
        />
      </div>
    </div>
  );
}
