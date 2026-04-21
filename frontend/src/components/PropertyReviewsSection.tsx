import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import StarIcon from '@mui/icons-material/Star';
import { API_BASE } from '../env';

interface Review {
  id: string;
  reviewerName: string;
  reviewerCountry: string | null;
  rating: number;
  language: string;
  title: string | null;
  comment: string;
  createdAt: string;
}

interface ReviewsResponse {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    averageRating: number;
  };
  reviews: Review[];
}

const PAGE_SIZE = 5;

async function fetchReviews(
  propertyId: string,
  page: number,
  lang?: string,
): Promise<ReviewsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (lang) params.set('lang', lang);
  const url = `${API_BASE}/api/search/properties/${propertyId}/reviews?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reviews for property ${propertyId}`);
  }
  return res.json() as Promise<ReviewsResponse>;
}

function StarRow({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          fontSize="small"
          sx={{ color: i < rounded ? '#f5a524' : '#e5e7eb' }}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

interface Props {
  propertyId: string;
  /** Fallback if reviews summary is not yet available from the endpoint. */
  fallbackAverage?: number;
  fallbackCount?: number;
}

export default function PropertyReviewsSection({
  propertyId,
  fallbackAverage,
  fallbackCount,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
  } = useInfiniteQuery({
    queryKey: ['property-reviews', propertyId, lang],
    queryFn: ({ pageParam = 1 }) =>
      fetchReviews(propertyId, pageParam as number, lang),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
  });

  const allReviews = data?.pages.flatMap((p) => p.reviews) ?? [];
  const summary = data?.pages[0]?.meta;
  const avg =
    summary?.averageRating ?? fallbackAverage ?? 0;
  const total = summary?.total ?? fallbackCount ?? 0;

  if (isPending) {
    return (
      <section className="mt-10" aria-busy="true">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          {t('property_detail.reviews')}
        </h2>
        <p className="text-gray-500 text-sm">{t('property_detail.reviews_loading')}</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          {t('property_detail.reviews')}
        </h2>
        <p className="text-red-500 text-sm">{t('property_detail.reviews_error')}</p>
      </section>
    );
  }

  if (total === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          {t('property_detail.reviews')}
        </h2>
        <p className="text-gray-500 text-sm">
          {t('property_detail.reviews_empty')}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">
          {t('property_detail.reviews')}
        </h2>
        <div className="flex items-center gap-2" aria-label={t('property_detail.rating_label')}>
          <StarRow value={avg} />
          <span className="text-sm font-semibold text-gray-900">
            {avg.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            ({t('property_detail.reviews_count', { count: total })})
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-4">
        {allReviews.map((review) => (
          <li
            key={review.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {review.reviewerName}
                  {review.reviewerCountry ? (
                    <span className="text-gray-400 font-normal"> · {review.reviewerCountry}</span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(review.createdAt, i18n.language)}
                </p>
              </div>
              <StarRow value={review.rating} />
            </div>
            {review.title && (
              <p className="font-medium text-gray-900 text-sm mb-1">
                {review.title}
              </p>
            )}
            <p className="text-gray-700 text-sm leading-relaxed">
              {review.comment}
            </p>
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {isFetchingNextPage
              ? t('property_detail.reviews_loading_more')
              : t('property_detail.reviews_load_more')}
          </Button>
        </div>
      )}
    </section>
  );
}