import { useEffect, useState } from 'react';
import { ISeller, TApiResponse } from '@types';

import { ScriptSrc } from '@common/Scripts';
import toast from 'react-hot-toast';
import { dashboardPageUrl } from '@variable';
import { AuthApi } from '@api/api.index';

export const LoginPage = () => {
  const [loginData, setLoginData] = useState<ISeller.TSellerLoginAndSignUpData>({
    email: '',
    password: '',
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpTaskId, setOtpTaskId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { data: sessionData } = AuthApi.useGetLoggedInUserQuery();
  const [userLogin] = AuthApi.useLoginMutation();
  const [forgotPassword, { isLoading: isSendingOtp }] = AuthApi.useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = AuthApi.useResetPasswordMutation();

  useEffect(() => {
    if (sessionData?.status_code === 200) {
      window.location.href = dashboardPageUrl;
    }
  }, [sessionData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = (await userLogin({
        email: (loginData.email || '').trim().toLowerCase(),
        password: loginData.password || '',
      }).unwrap()) as TApiResponse;

      if (res.status_code === 200) {
        toast.success(res?.message || 'Login successful');
        window.location.href = dashboardPageUrl;
        return;
      }

      toast.error(res?.data?.message || res?.message || 'Invalid credentials');
    } catch (error: any) {
      const message =
        error?.data?.data?.message ||
        error?.data?.message ||
        'Invalid email or password';
      toast.error(message);
    }
  };

  const onSendResetOtp = async () => {
    if (!forgotEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    try {
      const response = (await forgotPassword({ email: forgotEmail.trim().toLowerCase() }).unwrap()) as TApiResponse;
      if (response?.status_code === 200 && response?.data?.otpTaskId) {
        setOtpTaskId(response.data.otpTaskId);
        toast.success(response?.message || 'OTP sent successfully');
        return;
      }
      toast.error(response?.message || 'Failed to send OTP');
    } catch (error: any) {
      toast.error(error?.data?.data?.message || error?.data?.message || 'Failed to send OTP');
    }
  };

  const onResetPassword = async () => {
    if (!forgotEmail.trim() || !otpTaskId || !otp || !newPassword || !confirmPassword) {
      toast.error('Please complete all reset password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password and confirm password do not match');
      return;
    }
    try {
      const response = (await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: otp.trim(),
        otpTaskId,
        newPassword,
        confirmPassword,
      }).unwrap()) as TApiResponse;
      if (response?.status_code === 200) {
        toast.success(response?.message || 'Password reset successful');
        setShowResetPassword(false);
        setOtpTaskId('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        return;
      }
      toast.error(response?.message || 'Failed to reset password');
    } catch (error: any) {
      toast.error(error?.data?.data?.message || error?.data?.message || 'Failed to reset password');
    }
  };
  return (
    <>
      <ScriptSrc />
      <div className="authentication h-100 mt-5">
        <div className="container-fluid h-100">
          <div className="row justify-content-center h-100 align-items-center">
            <div className="col-md-6 mt-5 mb-5">
              <div className="authincation-content">
                <div className="row no-gutters">
                  <div className="col-xl-12">
                    <div className="auth-form">
                      <div className="text-center mb-3">
                        <a href="/">
                          <img src={`/logo/logo.png`} width={'100%'}></img>
                        </a>
                      </div>
                      <h4 className="text-center mb-4">Sign in your account</h4>
                      <form onSubmit={onLogin}>
                        <div className="form-group">
                          <label>
                            <strong>Email</strong>
                          </label>
                          <input type="email" name="email" onChange={handleChange} className="form-control" defaultValue={loginData.email} />
                        </div>
                        <div className="form-group">
                          <label>
                            <strong>Password</strong>
                          </label>
                          <input type="password" name="password" onChange={handleChange} className="form-control" defaultValue={loginData.password} />
                        </div>
                        <div className="form-row d-flex justify-content-between mt-4 mb-2">
                          <div className="form-group">
                            <div className="form-check ml-2">
                              <input className="form-check-input" type="checkbox" id="basic_checkbox_1" />
                              <label className="form-check-label" htmlFor="basic_checkbox_1">
                                Remember me
                              </label>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={() => setShowResetPassword((prev) => !prev)}
                          >
                            {showResetPassword ? 'Hide reset password' : 'Forgot password?'}
                          </button>
                        </div>
                        {showResetPassword && (
                          <div className="border rounded p-3 mb-3" style={{ background: '#f8fbff' }}>
                            <h6 className="mb-3">Reset Password</h6>
                            <div className="form-group">
                              <label>
                                <strong>Email</strong>
                              </label>
                              <input
                                type="email"
                                className="form-control"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                              />
                            </div>
                            {!otpTaskId ? (
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={onSendResetOtp} disabled={isSendingOtp}>
                                {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                              </button>
                            ) : (
                              <>
                                <div className="form-group mt-2">
                                  <label>
                                    <strong>OTP</strong>
                                  </label>
                                  <input type="text" className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label>
                                    <strong>New Password</strong>
                                  </label>
                                  <input
                                    type="password"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>
                                    <strong>Confirm Password</strong>
                                  </label>
                                  <input
                                    type="password"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                  />
                                </div>
                                <button type="button" className="btn btn-outline-success btn-sm" onClick={onResetPassword} disabled={isResettingPassword}>
                                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        <div className="text-center">
                          <button type="submit" className="btn btn-primary btn-block">
                            Sign me in
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
