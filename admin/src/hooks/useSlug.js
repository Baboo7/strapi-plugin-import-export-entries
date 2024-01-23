import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const SLUG_WHOLE_DB = 'custom:db';

export const useSlug = () => {
  const { pathname } = useLocation();

  const slug = useMemo(() => {
    const matches = pathname.match(/content-manager\/(collectionType|singleType|collection-types|single-types)\/([a-zA-Z0-9\-:_.]*)/);
    return matches?.[2] ? matches[2] : SLUG_WHOLE_DB;
  }, [pathname]);

  const isSlugWholeDb = useMemo(() => slug === SLUG_WHOLE_DB, [slug]);

  return {
    slug,
    isSlugWholeDb,
  };
};
