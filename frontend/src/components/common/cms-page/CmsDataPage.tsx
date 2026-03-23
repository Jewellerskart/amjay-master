interface CmsDataPageProps {
  data: string;
}

export const CmsDataPage: React.FC<CmsDataPageProps> = ({ data }) => {
  return <div dangerouslySetInnerHTML={{ __html: data }} />;
};
