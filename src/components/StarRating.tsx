import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 24,
}: StarRatingProps) {
  const handleClick = (star: number) => {
    if (!readOnly && onChange) {
      onChange(star);
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readOnly}
          className={`transition-all duration-200 ${
            readOnly
              ? 'cursor-default'
              : 'cursor-pointer hover:scale-110 active:scale-95'
          } disabled:opacity-100 bg-transparent border-none p-0`}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={`transition-colors duration-200 ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-surface-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
