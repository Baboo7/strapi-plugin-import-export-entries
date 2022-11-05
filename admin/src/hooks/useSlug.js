import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const useSlug = () => {
  const { pathname } = useLocation();

  const [slug, setSlug] = useState('');

  useEffect(() => {
    const [kind, slug] = pathname.split('/').slice(-2);

    if (['collectionType', 'singleType'].indexOf(kind) > -1) {
      setSlug(slug);
      return;
    }

    setSlug('');
  }, [pathname, setSlug]);

  return {
    slug,
  };
};
