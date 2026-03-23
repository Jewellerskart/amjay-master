import { ScriptSrc } from '@common/Scripts';

export const PageNotFound = () => {
  return (
    <>
      <ScriptSrc />
      <div className="authincation h-100 mt-5">
        <div className="container-fluid h-100 ">
          <div className="row justify-content-center h-100 align-items-center ">
            <div className="col-md-5 mt-5">
              <div className="form-input-content text-center mt-5">
                <div className="mb-5 mt-5">
                  <a className="btn btn-primary" href="/">
                    Back to Home
                  </a>
                </div>
                <h1 className="error-text font-weight-bold">404</h1>
                <h4 className="mt-4">
                  <i className="fa fa-exclamation-triangle text-warning"></i> The page you were looking for is not found!
                </h4>
                <p>You may have mistyped the address or the page may have moved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
