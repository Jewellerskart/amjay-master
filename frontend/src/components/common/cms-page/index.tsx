import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { usePostCmsMutation } from '@api/apiHooks/common';
import { PageNotFound } from '@common/error/404';
import { ScriptSrc } from '../Scripts';
import { CmsDataPage } from './CmsDataPage';
import type { TCms, TApiResponse } from '@types';

export const CmsPage = () => {
  const [cmsData, setCmsData] = useState<TCms>({
    url: '',
    data: '',
    name: '',
    status: false,
  });

  const { url } = useParams();
  const [cmsMutation] = usePostCmsMutation();

  const onCmsLoad = async () => {
    try {
      if (url) {
        const res = (await cmsMutation({ count: 1, fid: 'url', fbn: url }).unwrap()) as TApiResponse;
        setCmsData(res.data.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load page content');
    }
  };

  useEffect(() => {
    onCmsLoad();
  }, [url]);
  return (
    <>
      <ScriptSrc />
      {cmsData.url == url ? <CmsDataPage data={cmsData.data} /> : <PageNotFound />}
    </>
  );
};
