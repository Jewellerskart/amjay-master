import { Header } from '@common/header';
import { useAuthSellerLogin } from '@hooks/sellerAuth';
import { useUserNotifications } from '@common/UserNotifications';
import { Link } from 'react-router-dom';
import { NotificationUrl } from '@variable';
export const NotificationPage = () => {
  const { data: user } = useAuthSellerLogin();
  const { notifications: allMessages } = useUserNotifications(user);
  return (
    <>
      <Header />
      <div className="content-body">
        <div className="container-fluid">
          <div className="row page-titles mx-0">
            <div className="col-sm-12 m-2">
              <div className="welcome-text">
                <h4>Notifications</h4>
              </div>
            </div>

            <div className="col-12 card">
              <div className="card-body">
                {allMessages?.map((i) => (
                  <Link to={i?.href || NotificationUrl} key={i.id}>
                    <div
                      className={
                        i.severity === 'success'
                          ? 'alert alert-success '
                          : i.severity === 'warning'
                          ? 'alert alert-warning'
                          : i.severity === 'info'
                          ? 'alert alert-primary'
                          : 'alert alert-secondary'
                      }
                    >
                      <strong>{i.title}</strong>
                      <div>{i.description}</div>
                    </div>
                  </Link>
                ))}
                {allMessages.length === 0 && <div className="alert alert-light m-0">No notifications.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
