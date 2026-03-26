import { apiSlice } from '../apiSlice';
import type { ApiResponse } from '../types';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse, { email: string; password: string }>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    forgotPassword: builder.mutation<ApiResponse, { email: string }>({
      query: (body) => ({
        url: '/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    verifyForgotPasswordOtp: builder.mutation<ApiResponse, { email: string; otp: string; otpTaskId: string }>({
      query: (body) => ({
        url: '/verify-forgot-password-otp',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<
      ApiResponse,
      { email: string; otp: string; otpTaskId: string; newPassword: string; confirmPassword: string }
    >({
      query: (body) => ({
        url: '/reset-password',
        method: 'POST',
        body,
      }),
    }),
    registerUser: builder.mutation<ApiResponse, Record<string, unknown>>({
      query: (body) => ({
        url: '/register-user',
        method: 'PUT',
        body,
      }),
    }),
    checkBusinessName: builder.mutation<ApiResponse, { businessName: string }>({
      query: (body) => ({
        url: '/check-business-name',
        method: 'POST',
        body,
      }),
    }),
    refreshToken: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/refresh-token',
        method: 'POST',
      }),
    }),
    getLoggedInUser: builder.query<ApiResponse, void>({
      query: () => ({
        url: '/login-user',
        method: 'GET',
      }),
      providesTags: ['Auth'],
      keepUnusedDataFor: 60,
    }),
    getUsers: builder.mutation<ApiResponse, Record<string, unknown>>({
      query: (body) => ({
        url: '/get-users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    getUsersNames: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/get-users-name',
        method: 'GET',
      }),
    }),
    logout: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    getProfile: builder.query<ApiResponse, void>({
      query: () => ({
        url: '/profile',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),
    updateProfile: builder.mutation<ApiResponse, Record<string, unknown>>({
      query: (body) => ({
        url: '/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    uploadKycDocument: builder.mutation<
      ApiResponse,
      {
        userId: string
        documentType: string
        documentNumber: string
        verified?: boolean
        document?: File | null
      }
    >({
      query: ({ userId, documentType, documentNumber, verified, document }) => {
        const formData = new FormData()
        formData.append('documentType', documentType)
        formData.append('documentNumber', documentNumber)
        if (verified !== undefined) formData.append('verified', String(verified))
        if (document) formData.append('document', document)

        return {
          url: `/profile/kyc/${userId}`,
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Auth'],
    }),
    getUserByEmail: builder.query<ApiResponse, string>({
      query: (email) => ({
        url: `/admin-user/${encodeURIComponent(email)}`,
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    updateUserByEmail: builder.mutation<
      ApiResponse,
      { email: string; payload: Record<string, unknown> }
    >({
      query: ({ email, payload }) => ({
        url: `/admin-user/${encodeURIComponent(email)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['User'],
    }),
    deleteUserByEmail: builder.mutation<ApiResponse, { email: string }>({
      query: ({ email }) => ({
        url: `/admin-user/${encodeURIComponent(email)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useVerifyForgotPasswordOtpMutation,
  useResetPasswordMutation,
  useRegisterUserMutation,
  useCheckBusinessNameMutation,
  useRefreshTokenMutation,
  useGetLoggedInUserQuery,
  useGetUsersMutation,
  useGetUsersNamesMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadKycDocumentMutation,
  useGetUserByEmailQuery,
  useUpdateUserByEmailMutation,
  useDeleteUserByEmailMutation,
} = authApi;
