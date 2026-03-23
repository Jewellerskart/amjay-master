import { useEffect, type FC } from 'react';
import toast from 'react-hot-toast';
import { FRONTEND_URL } from '@variable';

const loadScript = async (src: string) => {
  const url = `${FRONTEND_URL}/${src}`;
  if (document.querySelector(`script[src="${url}"]`)) {
    return;
  }
  const script = document.createElement('script');
  script.src = url;
  script.defer = true;
  document.head.appendChild(script);

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
  });
};
interface ScriptSrcProps {
  script?: string[];
}
export const ScriptSrc: FC<ScriptSrcProps> = ({ script = [] }) => {
  useEffect(() => {
    const loadScripts = async () => {
      try {
        await loadScript('js/custom.min.js');
        await Promise.all(script.map((path) => loadScript(path)));
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load required assets');
      }
    };

    loadScripts();
  }, [script]);
  return null;
};
