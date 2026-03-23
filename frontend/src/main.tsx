import ReactDOM from 'react-dom/client';
import App from '@app/App';
import { Helmet } from 'react-helmet';
import { FRONTEND_URL } from '@variable';
import { AppLayout, AppProviders } from '@app/index';
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <Helmet>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Jewel Days - Admin Dashboard </title>
      <link rel="icon" type="image/png" sizes="16x16" href={`${FRONTEND_URL}/images/favicon.png`} />
      <link rel="stylesheet" href={`${FRONTEND_URL}/vendor/owl-carousel/css/owl.carousel.min.css`} />
      <link rel="stylesheet" href={`${FRONTEND_URL}/vendor/owl-carousel/css/owl.theme.default.min.css`} />
      <link rel="stylesheet" href={`${FRONTEND_URL}/vendor/jqvmap/css/jqvmap.min.css`} />
      <link rel="stylesheet" href={`${FRONTEND_URL}/scss/main.css`} />
      <link rel="stylesheet" href={`${FRONTEND_URL}/vendor/datatables/css/jquery.dataTables.min.css`} />
    </Helmet>
    <AppLayout>
      <App />
    </AppLayout>
  </AppProviders>
);
