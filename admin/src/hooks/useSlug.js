import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SLUG_WHOLE_DB = 'custom:db';

export const useSlug = () => {
  const { pathname } = useLocation();

  const [slug, setSlug] = useState('');

  useEffect(() => {
    const [kind, slug] = pathname.split('/').slice(-2);

    if (['collectionType', 'singleType'].indexOf(kind) > -1) {
      setSlug(slug);
      return;
    }

    setSlug(SLUG_WHOLE_DB);
  }, [pathname, setSlug]);

  const isSlugWholeDb = useCallback(() => {
    return slug === SLUG_WHOLE_DB;
  }, [slug]);

  return {
    slug,
    isSlugWholeDb,
  };
};
